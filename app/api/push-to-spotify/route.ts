import { NextRequest, NextResponse } from "next/server";
import type { ApiErrorCode, PushToSpotifyResponse } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import {
  readRefreshToken,
  setTokenCookies,
  updateAccessTokenCookie,
  clearTokenCookies,
} from "@/lib/cookies";
import {
  getSpotifyMe,
  createPlaylist,
  addTracksToPlaylist,
  replacePlaylistTracks,
  refreshSpotifyToken,
  SpotifyAuthError,
  SpotifyApiError,
} from "@/lib/spotify";
import { sanitizePrompt } from "@/lib/utils";
import { getUidFromRequest, getUserQuota, canPushToSpotify } from "@/lib/quota";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function errorResponse(message: string, code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

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

/**
 * Publish an already-generated playlist (from /api/generate) to the user's
 * Spotify account — either as a new playlist, or by replacing the tracks of
 * an existing one they own (existingPlaylistId).
 */
export async function POST(req: NextRequest) {
  // 1. Mood DJ account + plan check — pushing to Spotify is Flow Sync only.
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorResponse("Sign in to your Mood DJ account first.", "not_authenticated", 401);
  }
  const quota = await getUserQuota(uid);
  if (!canPushToSpotify(quota)) {
    return errorResponse(
      "Pushing to Spotify is a Flow Sync feature. Upgrade to publish this playlist.",
      "upgrade_required",
      403
    );
  }

  // 2. Spotify connection check.
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return errorResponse(
      "Connect your Spotify account first to push a playlist.",
      "not_connected",
      401
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request.", "invalid_tracks", 400);
  }

  const { playlistName, playlistDescription, trackUris, existingPlaylistId } = body as {
    playlistName?: unknown;
    playlistDescription?: unknown;
    trackUris?: unknown;
    existingPlaylistId?: unknown;
  };

  const name = sanitizePrompt(playlistName).slice(0, 100) || "Mood DJ Playlist";
  const description = typeof playlistDescription === "string" ? playlistDescription.slice(0, 300) : "";
  const targetPlaylistId = typeof existingPlaylistId === "string" && existingPlaylistId ? existingPlaylistId : null;

  if (
    !Array.isArray(trackUris) ||
    trackUris.length === 0 ||
    !trackUris.every((u) => typeof u === "string" && u.startsWith("spotify:track:"))
  ) {
    return errorResponse("No valid tracks to push.", "invalid_tracks", 400);
  }

  try {
    let playlistId: string;
    let playlistUrl: string;

    if (targetPlaylistId) {
      // Update: the caller only owns playlists returned by /api/spotify/playlists,
      // and Spotify itself rejects the write (403) if this user doesn't own it.
      await withFreshToken(accessToken, (t) => replacePlaylistTracks(t, targetPlaylistId, trackUris as string[]));
      playlistId = targetPlaylistId;
      playlistUrl = `https://open.spotify.com/playlist/${targetPlaylistId}`;
    } else {
      const me = await withFreshToken(accessToken, (t) => getSpotifyMe(t));
      const playlist = await withFreshToken(accessToken, (t) => createPlaylist(t, me.id, name, description));
      try {
        await withFreshToken(accessToken, (t) => addTracksToPlaylist(t, playlist.id, trackUris as string[]));
      } catch {
        return errorResponse(
          "Your playlist was created but tracks could not be added. Please try again.",
          "playlist_partial",
          502
        );
      }
      playlistId = playlist.id;
      playlistUrl = playlist.url;
    }

    const response: PushToSpotifyResponse = {
      spotifyPlaylistUrl: playlistUrl,
      playlistId,
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
    console.error("[/api/push-to-spotify] Spotify error", { status, message: (err as Error)?.message, err });
    return errorResponse(
      "Spotify could not create the playlist right now. Please reconnect and try again.",
      "spotify_error",
      502
    );
  }
}
