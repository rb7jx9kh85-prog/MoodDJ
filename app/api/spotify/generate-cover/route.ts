import { NextRequest, NextResponse } from "next/server";
import type { MoodPlan } from "@/types";
import { generateCoverArt, toSpotifySafeJpegBase64 } from "@/lib/cover-art";
import { getValidAccessToken } from "@/lib/auth";
import { setPlaylistCoverImage, SpotifyApiError } from "@/lib/spotify";
import { errorJson, withFreshToken } from "@/lib/spotify-session";
import { sanitizePrompt } from "@/lib/utils";
import { getUidFromRequest, getUserQuota, canPushToSpotify } from "@/lib/quota";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  isMoodDJPublisherConfigured,
  MoodDJPublisherUnavailableError,
  userOwnsMoodDJPublicPlaylist,
  withMoodDJPublisherToken,
} from "@/lib/mooddj-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Publisher = "user" | "mooddj";

function boundedNumber(value: unknown, fallback = 50): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizePrompt(item).slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function toCoverPlan(body: Record<string, unknown>, playlistName: string): Pick<
  MoodPlan,
  "vibe" | "scene" | "genres" | "emotionalTone" | "energy" | "darkness" | "sensuality"
> {
  return {
    vibe: sanitizePrompt(body.vibe).slice(0, 120) || playlistName,
    scene: sanitizePrompt(body.scene).slice(0, 200) || playlistName,
    genres: cleanList(body.genres, 8, 40),
    emotionalTone: cleanList(body.emotionalTone, 6, 30),
    energy: boundedNumber(body.energy),
    darkness: boundedNumber(body.darkness),
    sensuality: boundedNumber(body.sensuality),
  };
}

/** Generates a cover on demand, after a playlist was successfully published. */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorJson("Sign in to your Mood DJ account first.", "not_authenticated", 401);
  }
  try {
    await enforceRateLimit("spotify_cover", uid, 3, 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many cover requests. Please wait a moment.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }
    throw err;
  }

  const quota = await getUserQuota(uid);
  if (!canPushToSpotify(quota)) {
    return errorJson("AI playlist covers are a Flow Sync feature.", "upgrade_required", 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return errorJson("Invalid request.", "invalid_tracks", 400);
  }

  const playlistId =
    typeof body.playlistId === "string" && /^[A-Za-z0-9]{10,64}$/.test(body.playlistId)
      ? body.playlistId
      : null;
  if (!playlistId) {
    return errorJson("Invalid playlist identifier.", "invalid_tracks", 400);
  }
  const publisher: Publisher = body.publisher === "mooddj" ? "mooddj" : "user";
  const playlistName = sanitizePrompt(body.playlistName).slice(0, 100) || "Mood DJ Playlist";

  if (publisher === "mooddj") {
    if (!(await isMoodDJPublisherConfigured())) {
      return errorJson(
        "Mood DJ's public Spotify account is not configured yet.",
        "mooddj_publisher_not_configured",
        503
      );
    }
    if (!(await userOwnsMoodDJPublicPlaylist(uid, playlistId))) {
      return errorJson(
        "You can only create a cover for a public playlist you published from Mood DJ.",
        "publisher_playlist_not_owned",
        403
      );
    }
  }

  const cover = await generateCoverArt(uid, playlistId, toCoverPlan(body, playlistName));
  if (!cover) {
    return errorJson(
      "Mood DJ could not create the AI cover right now. Please try again.",
      "cover_generation_failed",
      502
    );
  }

  try {
    const jpegBase64 = await toSpotifySafeJpegBase64(cover.pngBuffer);
    if (publisher === "mooddj") {
      await withMoodDJPublisherToken((accessToken) => setPlaylistCoverImage(accessToken, playlistId, jpegBase64));
    } else {
      const accessToken = await getValidAccessToken(uid);
      if (!accessToken) {
        return errorJson("Connect your Spotify account first to set its cover.", "not_connected", 401, true);
      }
      await withFreshToken(accessToken, (token) => setPlaylistCoverImage(token, playlistId, jpegBase64));
    }
    return NextResponse.json({ coverImageUrl: cover.url });
  } catch (err) {
    if (err instanceof MoodDJPublisherUnavailableError) {
      return errorJson(err.message, "mooddj_publisher_not_configured", 503);
    }
    if (err instanceof SpotifyApiError) {
      console.error("[/api/spotify/generate-cover] Spotify API error", {
        uid: uid.slice(0, 6),
        status: err.status,
        spotifyMessage: err.spotifyMessage ?? null,
      });
      return errorJson(
        err.spotifyMessage || "Spotify could not apply the cover image.",
        "spotify_error",
        502
      );
    }
    console.error("[/api/spotify/generate-cover] Cover upload failed", {
      uid: uid.slice(0, 6),
      reason: err instanceof Error ? err.message : String(err),
    });
    return errorJson("Spotify could not apply the cover image.", "spotify_error", 502);
  }
}
