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
  SpotifyAuthError,
} from "@/lib/spotify";
import { generateMoodPlan, fallbackMoodPlan, OpenAIGenerationError } from "@/lib/openai";
import { sanitizePrompt, dedupeByUri, shuffle, MAX_PROMPT_LENGTH } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(message: string, code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Run a Spotify operation with an access token, transparently refreshing once
 * if Spotify rejects the token mid-request.
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
  // 1. Auth check.
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return errorResponse(
      "Connect your Spotify account first to create a real playlist.",
      "not_connected",
      401
    );
  }

  // 2. Validate prompt.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request.", "empty_prompt", 400);
  }
  const rawPrompt = (body as { prompt?: unknown })?.prompt;
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
    // 4. Identify the user.
    const me = await withFreshToken(accessToken, (t) => getSpotifyMe(t));

    // 5. Search tracks across all queries and merge.
    const perQuery = 8;
    const collected: Track[] = [];
    const results = await Promise.all(
      plan.searchQueries.map((q) =>
        withFreshToken(accessToken, (t) => searchTracks(t, q, perQuery)).catch(() => [] as Track[])
      )
    );
    for (const list of results) collected.push(...list);

    const unique = dedupeByUri(collected);
    if (unique.length === 0) {
      return errorResponse("No tracks found for this mood. Try a different vibe.", "no_tracks", 422);
    }

    // 6. Select ~trackCount tracks (lightly shuffled for variety).
    const target = Math.min(plan.trackCount || 15, 20);
    const selected = shuffle(unique).slice(0, Math.max(target, Math.min(10, unique.length)));

    // 7. Create the playlist.
    const playlist = await withFreshToken(accessToken, (t) =>
      createPlaylist(t, me.id, plan.playlistName, plan.playlistDescription)
    );

    // 8. Add the tracks.
    try {
      await withFreshToken(accessToken, (t) =>
        addTracksToPlaylist(t, playlist.id, selected.map((s) => s.uri))
      );
    } catch {
      return errorResponse(
        "Your playlist was created but tracks could not be added. Please try again.",
        "playlist_partial",
        502
      );
    }

    // 9. Respond.
    const response: GeneratedPlaylistResponse = {
      playlistName: plan.playlistName,
      playlistDescription: plan.playlistDescription,
      vibe: plan.vibe,
      scene: plan.scene,
      energy: plan.energy,
      emotionalTone: plan.emotionalTone,
      genres: plan.genres,
      transitionLogic: plan.transitionLogic,
      tracks: selected,
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
    return errorResponse(
      "Spotify could not create the playlist right now. Please reconnect and try again.",
      "spotify_error",
      502
    );
  }
}
