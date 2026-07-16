import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { GeneratedPlaylistResponse, Track, ApiErrorCode } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import { generateCoverArt, toSpotifySafeJpegBase64 } from "@/lib/cover-art";
import {
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
  setPlaylistCoverImage,
  getAppAccessToken,
  applyHardFilters,
  curateTracks,
  orderByProgression,
  MAX_SEARCH_LIMIT,
} from "@/lib/spotify";
import { withFreshToken, spotifyFailureResponse } from "@/lib/spotify-session";
import { generateMoodPlan, fallbackMoodPlan, OpenAIGenerationError } from "@/lib/openai";
import { sanitizePrompt, sanitizeGenerationOptions, MAX_PROMPT_LENGTH } from "@/lib/utils";
import {
  getUidFromRequest,
  getUserQuota,
  canGenerate,
  canPushToSpotify,
  reserveGeneration,
  refundGeneration,
} from "@/lib/quota";
import { recordPlaylistHistory } from "@/lib/playlist-history";
import { recordPlaylistGenerated, activateReferralIfEligible } from "@/lib/referral";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

// firebase-admin (via lib/quota) needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(message: string, code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Post-generation bookkeeping: quota consumption, playlist history, and
 * referral activation. History/referral steps are best-effort — a failure
 * here must never turn a successful generation into an error response for
 * the user.
 */
async function finalizeGeneration(
  uid: string,
  response: GeneratedPlaylistResponse
): Promise<void> {
  try {
    const { isFirstEver } = await recordPlaylistHistory(uid, response);
    await recordPlaylistGenerated(uid);
    if (isFirstEver) {
      await activateReferralIfEligible(uid);
    }
  } catch (err) {
    console.error("[/api/generate] Referral/history bookkeeping failed", {
      uid: uid.slice(0, 6),
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(req: NextRequest) {
  // 1. Mood DJ account + plan/quota check.
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorResponse("Sign in to your Mood DJ account first.", "not_authenticated", 401);
  }
  // Email verification is only required to claim referral/welcome credits.
  // It must not block the core preview generation flow: users can generate
  // without Spotify and without waiting for an email link.
  try {
    await enforceRateLimit("generate", uid, 6, 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many generations. Please wait a moment.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }
    throw err;
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
    userAccessToken = await getValidAccessToken(uid);
    if (!userAccessToken) {
      return errorResponse(
        "Connect your Spotify account first to push a playlist.",
        "not_connected",
        401
      );
    }
  }

  const reservation = await reserveGeneration(uid);
  if (!reservation) {
    return errorResponse(
      "You've used your free playlist. Upgrade to Flow for unlimited generation.",
      "quota_exceeded",
      403
    );
  }

  let delivered = false;
  try {
    // 5. Build the mood plan (fall back to a heuristic plan if OpenAI fails).
    const uidTag = uid.slice(0, 6);
    let plan;
    try {
      plan = await generateMoodPlan(prompt, options);
    } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
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
      console.error("[/api/generate] OpenAI generation failed, using fallback plan", {
        uid: uidTag,
        reason,
      });
      plan = fallbackMoodPlan(prompt, options);
      } else {
        console.error("[/api/generate] Unexpected error building mood plan, using fallback plan", {
          uid: uidTag,
          reason,
        });
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

    // Request as many results per query as Spotify's Feb-2026-reduced
    // `limit` cap allows — asking for more (the old 12/8 split, back when
    // the max was 50) now fails the request outright instead of clamping.
    // More search queries (up to 16, per the system prompt) make up for the
    // lower per-query ceiling.
    const perQuery = MAX_SEARCH_LIMIT;
    // Cover art runs alongside the Spotify searches (not after) so it adds
    // no perceived latency — generated for every playlist, preview or not.
    const coverId = randomUUID();
    const [results, cover] = await Promise.all([
      Promise.all(
        plan.searchQueries.map((q) =>
          searchWith(q, perQuery).catch((err) => {
            console.error("[/api/generate] search query failed", {
              uid: uidTag,
              query: q,
              reason: err instanceof Error ? err.message : String(err),
            });
            return [] as Track[];
          })
        )
      ),
      generateCoverArt(uid, coverId, plan),
    ]);

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
      console.error("[/api/generate] No tracks found after search + filters", {
        uid: uidTag,
        queries: plan.searchQueries.length,
        rawCandidates: candidates.length,
      });
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
      ...(cover ? { coverImageUrl: cover.url } : {}),
    };

    if (!pushToSpotify || !userAccessToken) {
      const response: GeneratedPlaylistResponse = { ...base, pushedToSpotify: false };
      await finalizeGeneration(uid, response);
      delivered = true;
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

    // Best-effort: the playlist + tracks are already a success without this.
    // Fails silently (e.g. the user hasn't reconnected Spotify to grant the
    // newly-added ugc-image-upload scope yet) rather than breaking the push.
    if (cover) {
      try {
        const jpegBase64 = await toSpotifySafeJpegBase64(cover.pngBuffer);
        await withFreshToken(userAccessToken, (t) => setPlaylistCoverImage(t, playlist.id, jpegBase64));
      } catch (err) {
        console.error("[/api/generate] Failed to set Spotify cover image", {
          uid: uidTag,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const response: GeneratedPlaylistResponse = {
      ...base,
      pushedToSpotify: true,
      spotifyPlaylistUrl: playlist.url,
      playlistId: playlist.id,
    };
    await finalizeGeneration(uid, response);
    delivered = true;
    return NextResponse.json(response);
    } catch (err) {
      return spotifyFailureResponse(err, {
        route: "/api/generate",
        uid,
        fallbackCode: "spotify_playlist_create_failed",
        fallbackMessage: "Spotify could not create the playlist right now. Please try again.",
      });
    }
  } finally {
    if (!delivered) {
      await refundGeneration(uid, reservation).catch((err) => {
        console.error("[/api/generate] Reservation refund failed", {
          uid: uid.slice(0, 6),
          reason: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}
