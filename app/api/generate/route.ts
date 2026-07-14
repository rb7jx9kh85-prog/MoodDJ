import { NextRequest, NextResponse } from "next/server";
import type { GeneratedPlaylistResponse, Track, ApiErrorCode } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import {
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
  getAppAccessToken,
  applyHardFilters,
  curateTracks,
  orderByProgression,
} from "@/lib/spotify";
import { withFreshToken, spotifyFailureResponse } from "@/lib/spotify-session";
import { generateMoodPlan, fallbackMoodPlan, OpenAIGenerationError } from "@/lib/openai";
import { sanitizePrompt, sanitizeGenerationOptions, MAX_PROMPT_LENGTH } from "@/lib/utils";
import { getUidFromRequest, getUserQuota, canGenerate, canPushToSpotify, recordGeneration } from "@/lib/quota";

// firebase-admin (via lib/quota) needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(message: string, code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  // 1. Mood DJ account + plan/quota check.
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorResponse("Sign in to your Mood DJ account first.", "not_authenticated", 401);
  }
  const quota = await getUserQuota(uid);
  if (!canGenerate(quota)) {
    return errorResponse(
      "You've used your free playlist. Upgrade to Flow for unlimited generation.",
      "quota_exceeded",
      403
    );
  }

  // 2. Parse & validate the request.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request.", "empty_prompt", 400);
  }
  const rawPrompt = (body as { prompt?: unknown })?.prompt;
  const pushToSpotify = (body as { pushToSpotify?: unknown })?.pushToSpotify === true;
  const options = sanitizeGenerationOptions((body as { options?: unknown })?.options);

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

  // 3. Pushing to Spotify is a Flow Sync feature.
  if (pushToSpotify && !canPushToSpotify(quota)) {
    return errorResponse(
      "Pushing to Spotify is a Flow Sync feature. Upgrade to publish this playlist.",
      "upgrade_required",
      403
    );
  }

  // 4. Only require a connected Spotify account when we're actually going to
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

  // 5. Build the mood plan (fall back to a heuristic plan if OpenAI fails).
  let plan;
  try {
    plan = await generateMoodPlan(prompt, options);
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
      plan = fallbackMoodPlan(prompt, options);
    } else {
      plan = fallbackMoodPlan(prompt, options);
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

    // Fetch more per query for longer playlists so filtering/dedup still
    // leaves enough unique tracks to hit the requested count.
    const perQuery = options.trackCount >= 20 ? 12 : 8;
    const results = await Promise.all(
      plan.searchQueries.map((q) => searchWith(q, perQuery).catch(() => [] as Track[]))
    );

    // Dedupe by URI while remembering each track's best (lowest) rank within
    // its own query's results — Spotify already ranks search hits by
    // relevance, so this is real signal for curateTracks' scoring below.
    const candidateMap = new Map<string, { track: Track; queryRank: number }>();
    for (const list of results) {
      list.forEach((track, rank) => {
        if (!track.uri) return;
        const existing = candidateMap.get(track.uri);
        if (!existing || rank < existing.queryRank) {
          candidateMap.set(track.uri, { track, queryRank: rank });
        }
      });
    }

    // Deterministic technical filters (explicit/remix/live/cover toggles,
    // excluded artists) — never phrased as instructions to the model.
    const candidates = Array.from(candidateMap.values());
    const allowedUris = new Set(
      applyHardFilters(
        candidates.map((c) => c.track),
        options
      ).map((t) => t.uri)
    );
    const filteredCandidates = candidates.filter((c) => allowedUris.has(c.track.uri));

    if (filteredCandidates.length === 0) {
      return errorResponse("No tracks found for this mood. Try a different vibe.", "no_tracks", 422);
    }

    // 5. trackCount is deterministic: the backend guarantees this exact
    // count (or as many as the searches produced, if fewer), never the
    // model's own suggestion. Score, cap per-artist repeats for diversity,
    // then order the final set per the requested progression.
    const target = Math.min(options.trackCount, filteredCandidates.length);
    const curated = curateTracks(filteredCandidates, options, target);
    const selected = orderByProgression(curated, options.progression);

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
      await recordGeneration(uid);
      const response: GeneratedPlaylistResponse = { ...base, pushedToSpotify: false };
      return NextResponse.json(response);
    }

    // 6. Create the playlist on the user's account and add the tracks.
    const playlist = await withFreshToken(userAccessToken, (t) =>
      createPlaylist(t, plan.playlistName, plan.playlistDescription)
    );

    try {
      await withFreshToken(userAccessToken, (t) =>
        addTracksToPlaylist(t, playlist.id, selected.map((s) => s.uri))
      );
    } catch (err) {
      return spotifyFailureResponse(err, {
        route: "/api/generate",
        uid,
        fallbackCode: "spotify_tracks_add_failed",
        fallbackMessage:
          "Your playlist was created but tracks could not be added. Please try again.",
      });
    }

    await recordGeneration(uid);
    const response: GeneratedPlaylistResponse = {
      ...base,
      pushedToSpotify: true,
      spotifyPlaylistUrl: playlist.url,
      playlistId: playlist.id,
    };
    return NextResponse.json(response);
  } catch (err) {
    return spotifyFailureResponse(err, {
      route: "/api/generate",
      uid,
      fallbackCode: "spotify_playlist_create_failed",
      fallbackMessage: "Spotify could not create the playlist right now. Please try again.",
    });
  }
}
