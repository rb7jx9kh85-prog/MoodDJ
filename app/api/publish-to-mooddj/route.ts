import { NextRequest, NextResponse } from "next/server";
import type { PushToSpotifyResponse } from "@/types";
import { addTracksToPlaylist, createPlaylist, SpotifyApiError } from "@/lib/spotify";
import { errorJson } from "@/lib/spotify-session";
import { sanitizePrompt } from "@/lib/utils";
import { getUidFromRequest, getUserQuota, canPushToSpotify } from "@/lib/quota";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  isMoodDJPublisherConfigured,
  MoodDJPublisherUnavailableError,
  recordMoodDJPublicPlaylist,
  withMoodDJPublisherToken,
} from "@/lib/mooddj-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Publishes the generated tracks on Mood DJ's dedicated Spotify account.
 * This is deliberately an explicit user action: the resulting playlist is
 * public and visible on the shared Mood DJ Spotify profile.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorJson("Sign in to your Mood DJ account first.", "not_authenticated", 401);
  }

  try {
    await enforceRateLimit("mooddj_public_push", uid, 6, 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many publishing requests. Please wait a moment.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }
    throw err;
  }

  const quota = await getUserQuota(uid);
  if (!canPushToSpotify(quota)) {
    return errorJson(
      "Public Spotify publishing is a Flow Sync feature. Upgrade to publish this playlist.",
      "upgrade_required",
      403
    );
  }

  if (!(await isMoodDJPublisherConfigured())) {
    return errorJson(
      "Mood DJ's public Spotify account is not configured yet. The owner must connect it once in Settings.",
      "mooddj_publisher_not_configured",
      503
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Invalid request.", "invalid_tracks", 400);
  }

  const { playlistName, playlistDescription, trackUris } = body as {
    playlistName?: unknown;
    playlistDescription?: unknown;
    trackUris?: unknown;
  };
  const name = sanitizePrompt(playlistName).slice(0, 100) || "Mood DJ Playlist";
  const description = typeof playlistDescription === "string" ? playlistDescription.slice(0, 300) : "";
  const rawUris = Array.isArray(trackUris) ? trackUris : [];
  if (rawUris.length > 100) {
    return errorJson("A playlist may contain at most 100 tracks.", "invalid_tracks", 400);
  }
  const validUris = Array.from(
    new Set(
      rawUris.filter((uri): uri is string => typeof uri === "string" && /^spotify:track:[A-Za-z0-9]+$/.test(uri))
    )
  );
  if (validUris.length === 0) {
    return errorJson("No valid tracks to publish.", "invalid_tracks", 400);
  }

  try {
    const playlist = await withMoodDJPublisherToken((accessToken) =>
      createPlaylist(accessToken, name, description, true)
    );
    await withMoodDJPublisherToken((accessToken) => addTracksToPlaylist(accessToken, playlist.id, validUris));
    await recordMoodDJPublicPlaylist(uid, playlist.id);

    const response: PushToSpotifyResponse = {
      spotifyPlaylistUrl: playlist.url,
      playlistId: playlist.id,
      spotifyPublisher: "mooddj",
    };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof MoodDJPublisherUnavailableError) {
      return errorJson(err.message, "mooddj_publisher_not_configured", 503);
    }
    if (err instanceof SpotifyApiError) {
      console.error("[/api/publish-to-mooddj] Spotify API error", {
        uid: uid.slice(0, 6),
        status: err.status,
        spotifyMessage: err.spotifyMessage ?? null,
      });
      return errorJson(
        err.spotifyMessage || "Spotify could not publish this public playlist right now.",
        "spotify_playlist_create_failed",
        502
      );
    }
    console.error("[/api/publish-to-mooddj] Unexpected error", {
      uid: uid.slice(0, 6),
      reason: err instanceof Error ? err.message : String(err),
    });
    return errorJson(
      "Mood DJ could not publish this playlist right now. Please try again.",
      "spotify_playlist_create_failed",
      502
    );
  }
}
