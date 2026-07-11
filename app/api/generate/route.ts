import { NextRequest, NextResponse } from "next/server";
import type { GeneratedPlaylistResponse, Track, ApiErrorCode } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import {
  readRefreshToken,
  setTokenCookies,
  updateAccessTokenCookie,
  clearTokenCookies,
} from "@/lib/cookies";
import {
  getSpotifyMe,
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
  refreshSpotifyToken,
  getAppAccessToken,
  SpotifyAuthError,
  SpotifyApiError,
} from "@/lib/spotify";
import { generateMoodPlan, fallbackMoodPlan, OpenAIGenerationError } from "@/lib/openai";
import { sanitizePrompt, dedupeByUri, shuffle, MAX_PROMPT_LENGTH } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(message: string, code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Run a Spotify operation with a *user* access token, transparently
 * refreshing once if Spotify rejects the token mid-request. Only relevant
 * when we're actually acting on the user's account (pushToSpotify=true) —
 * the app-only token used for search-only requests never needs this.
 */
async function withFreshToken<T>(
  token: string,
  op: (token: string) => Promise<T>
): Promise<T> {
  try {
    return await op(token);
  } catch (err) {
    if (!(err instanceof SpotifyAuthError)) throw err;
    const refresh = await readRefreshToken();
    if (!refresh) throw err;
    const refreshed = await refreshSpotifyToken(refresh);
    if (refreshed.refreshToken) {
      await setTokenCookies(refreshed.accessToken, refreshed.refreshToken, refreshed.expiresIn);
    } else {
      await updateAccessTokenCookie(refreshed.accessToken, refreshed.expiresIn);
    }
    return op(refreshed.accessToken);
  }
}

export async function POST(req: NextRequest) {
  // 1. Parse & validate the request.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request.", "empty_prompt", 400);
  }
  const rawPrompt = (body as { prompt?: unknown })?.prompt;
  const pushToSpotify = (body as { pushToSpotify?: unknown })?.pushToSpotify === true;

  if (typeof rawPrompt !== "string" || rawPrompt.trim().length === 0) {
    return errorResponse("Describe a vibe before generating your playlist.", "empty_prompt", 400);
  }
  if (rawPrompt.length > MAX_PROMPT_LENGTH + 50) {
    return errorResponse(
      `Keep your vibe under ${MAX_PROMPT_LENGTH} characters.`,
      "prompt_too_long",
      400
    );
  }
  const prompt = sanitizePrompt(rawPrompt);
  if (!prompt) {
    return errorResponse("Describe a vibe before generating your playlist.", "empty_prompt", 400);
  }

  // 2. Only require a connected Spotify account when we're actually going to
  // write to it — generating a preview only needs an app-level token.
  let userAccessToken: string | null = null;
  if (pushToSpotify) {
    userAccessToken = await getValidAccessToken();
    if (!userAccessToken) {
      return errorResponse(
        "Connect your Spotify account first to push a playlist.",
        "not_connected",
        401
      );
    }
  }

  // 3. Build the mood plan (fall back to a heuristic plan if OpenAI fails).
  let plan;
  try {
    plan = await generateMoodPlan(prompt);
  } catch (err) {
    if (err instanceof OpenAIGenerationError) {
      // If OpenAI is simply not configured, surface a clear error; otherwise
      // degrade gracefully so the user still gets a playlist.
      if (!process.env.OPENAI_API_KEY) {
        return errorResponse(
          "Mood DJ could not read the vibe. Try again with a simpler description.",
          "openai_error",
          502
        );
      }
      plan = fallbackMoodPlan(prompt);
    } else {
      plan = fallbackMoodPlan(prompt);
    }
  }

  try {
    // 4. Search tracks across all queries and merge. A search-only request
    // uses the app's own Client Credentials token (no user involved at
    // all); a push request reuses the user's token since we'll need it
    // right after anyway.
    const searchWith = async (query: string, limit: number): Promise<Track[]> => {
      if (pushToSpotify && userAccessToken) {
        return withFreshToken(userAccessToken, (t) => searchTracks(t, query, limit));
      }
      return searchTracks(await getAppAccessToken(), query, limit);
    };

    const perQuery = 8;
    const collected: Track[] = [];
    const results = await Promise.all(
      plan.searchQueries.map((q) => searchWith(q, perQuery).catch(() => [] as Track[]))
    );
    for (const list of results) collected.push(...list);

    const unique = dedupeByUri(collected);
    if (unique.length === 0) {
      return errorResponse("No tracks found for this mood. Try a different vibe.", "no_tracks", 422);
    }

    // 5. Select ~trackCount tracks (lightly shuffled for variety).
    const target = Math.min(plan.trackCount || 15, 20);
    const selected = shuffle(unique).slice(0, Math.max(target, Math.min(10, unique.length)));

    const base = {
      playlistName: plan.playlistName,
      playlistDescription: plan.playlistDescription,
      vibe: plan.vibe,
      scene: plan.scene,
      energy: plan.energy,
      emotionalTone: plan.emotionalTone,
      genres: plan.genres,
      transitionLogic: plan.transitionLogic,
      tracks: selected,
    };

    if (!pushToSpotify || !userAccessToken) {
      const response: GeneratedPlaylistResponse = { ...base, pushedToSpotify: false };
      return NextResponse.json(response);
    }

    // 6. Create the playlist on the user's account and add the tracks.
    const me = await withFreshToken(userAccessToken, (t) => getSpotifyMe(t));
    const playlist = await withFreshToken(userAccessToken, (t) =>
      createPlaylist(t, me.id, plan.playlistName, plan.playlistDescription)
    );

    try {
      await withFreshToken(userAccessToken, (t) =>
        addTracksToPlaylist(t, playlist.id, selected.map((s) => s.uri))
      );
    } catch {
      return errorResponse(
        "Your playlist was created but tracks could not be added. Please try again.",
        "playlist_partial",
        502
      );
    }

    const response: GeneratedPlaylistResponse = {
      ...base,
      pushedToSpotify: true,
      spotifyPlaylistUrl: playlist.url,
      playlistId: playlist.id,
    };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof SpotifyAuthError) {
      await clearTokenCookies();
      return errorResponse(
        "Your Spotify session expired. Please connect again.",
        "session_expired",
        401
      );
    }
    const status = err instanceof SpotifyApiError ? err.status : undefined;
    console.error("[/api/generate] Spotify error", { status, message: (err as Error)?.message, err });
    return errorResponse(
      "Spotify could not create the playlist right now. Please reconnect and try again.",
      "spotify_error",
      502
    );
  }
}
