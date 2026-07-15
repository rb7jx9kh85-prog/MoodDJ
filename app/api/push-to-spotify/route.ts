import { NextRequest, NextResponse } from "next/server";
import type { PushToSpotifyResponse } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import {
  createPlaylist,
  addTracksToPlaylist,
  replacePlaylistTracks,
  setPlaylistCoverImage,
} from "@/lib/spotify";
import { fetchImageAsBuffer, toSpotifySafeJpegBase64 } from "@/lib/cover-art";
import { withFreshToken, spotifyFailureResponse, errorJson } from "@/lib/spotify-session";
import { sanitizePrompt } from "@/lib/utils";
import { getUidFromRequest, getUserQuota, canPushToSpotify } from "@/lib/quota";

// firebase-admin (via lib/quota) needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Publish an already-generated playlist (from /api/generate) to the user's
 * Spotify account — either as a new playlist, or by replacing the tracks of
 * an existing one they own (existingPlaylistId).
 */
export async function POST(req: NextRequest) {
  // 1. Mood DJ account + plan check — pushing to Spotify is Flow Sync only.
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorJson("Sign in to your Mood DJ account first.", "not_authenticated", 401);
  }
  const quota = await getUserQuota(uid);
  if (!canPushToSpotify(quota)) {
    return errorJson(
      "Pushing to Spotify is a Flow Sync feature. Upgrade to publish this playlist.",
      "upgrade_required",
      403
    );
  }

  // 2. Spotify connection check (refreshes the access token if expired).
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return errorJson(
      "Connect your Spotify account first to push a playlist.",
      "not_connected",
      401,
      true
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Invalid request.", "invalid_tracks", 400);
  }

  const { playlistName, playlistDescription, trackUris, existingPlaylistId, coverImageUrl } = body as {
    playlistName?: unknown;
    playlistDescription?: unknown;
    trackUris?: unknown;
    existingPlaylistId?: unknown;
    coverImageUrl?: unknown;
  };

  const name = sanitizePrompt(playlistName).slice(0, 100) || "Mood DJ Playlist";
  const description = typeof playlistDescription === "string" ? playlistDescription.slice(0, 300) : "";
  const targetPlaylistId =
    typeof existingPlaylistId === "string" && existingPlaylistId ? existingPlaylistId : null;
  const coverUrl = typeof coverImageUrl === "string" && coverImageUrl ? coverImageUrl : null;

  // Only well-formed track URIs may reach Spotify (IDs alone are rejected).
  const rawUris = Array.isArray(trackUris) ? trackUris : [];
  const validUris = rawUris.filter(
    (u): u is string => typeof u === "string" && /^spotify:track:[A-Za-z0-9]+$/.test(u)
  );

  if (validUris.length === 0) {
    console.error("[/api/push-to-spotify] No valid track URIs", {
      uid: uid.slice(0, 6),
      received: rawUris.length,
    });
    return errorJson("No valid tracks to push.", "invalid_tracks", 400);
  }

  const uidTag = uid.slice(0, 6);
  console.log("[/api/push-to-spotify] start", {
    uid: uidTag,
    mode: targetPlaylistId ? "update" : "create",
    urisReceived: rawUris.length,
    urisValid: validUris.length,
  });

  try {
    let playlistId: string;
    let playlistUrl: string;

    if (targetPlaylistId) {
      // Update: the caller only owns playlists returned by /api/spotify/playlists,
      // and Spotify itself rejects the write (403) if this user doesn't own it.
      await withFreshToken(accessToken, (t) => replacePlaylistTracks(t, targetPlaylistId, validUris));
      playlistId = targetPlaylistId;
      playlistUrl = `https://open.spotify.com/playlist/${targetPlaylistId}`;
    } else {
      const playlist = await withFreshToken(accessToken, (t) =>
        createPlaylist(t, name, description)
      );
      try {
        await withFreshToken(accessToken, (t) => addTracksToPlaylist(t, playlist.id, validUris));
      } catch (err) {
        // The playlist exists but is empty — that is NOT a success.
        console.error("[/api/push-to-spotify] Tracks add failed after create", {
          uid: uidTag,
          playlistId: playlist.id.slice(0, 8),
        });
        return spotifyFailureResponse(err, {
          route: "/api/push-to-spotify",
          uid,
          fallbackCode: "spotify_tracks_add_failed",
          fallbackMessage:
            "Your playlist was created but tracks could not be added. Please try again.",
        });
      }
      playlistId = playlist.id;
      playlistUrl = playlist.url;
    }

    // Best-effort: the playlist (create or update) already succeeded
    // without this. Fails silently (missing ugc-image-upload scope until
    // reconnect, transient error, ...) rather than breaking the push.
    if (coverUrl) {
      try {
        const pngBuffer = await fetchImageAsBuffer(coverUrl);
        if (pngBuffer) {
          const jpegBase64 = await toSpotifySafeJpegBase64(pngBuffer);
          await withFreshToken(accessToken, (t) => setPlaylistCoverImage(t, playlistId, jpegBase64));
        }
      } catch (err) {
        console.error("[/api/push-to-spotify] Failed to set Spotify cover image", {
          uid: uidTag,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    console.log("[/api/push-to-spotify] done", {
      uid: uidTag,
      playlistId: playlistId.slice(0, 8),
      tracks: validUris.length,
    });

    const response: PushToSpotifyResponse = {
      spotifyPlaylistUrl: playlistUrl,
      playlistId,
    };
    return NextResponse.json(response);
  } catch (err) {
    return spotifyFailureResponse(err, {
      route: "/api/push-to-spotify",
      uid,
      fallbackCode: "spotify_playlist_create_failed",
      fallbackMessage: "Spotify could not create the playlist right now. Please try again.",
    });
  }
}
