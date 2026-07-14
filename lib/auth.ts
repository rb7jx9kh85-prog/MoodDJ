import {
  readAccessToken,
  readRefreshToken,
  updateAccessTokenCookie,
  setTokenCookies,
  clearTokenCookies,
} from "@/lib/cookies";
import { refreshSpotifyToken } from "@/lib/spotify";

/**
 * Scopes required to read the profile, list the user's playlists (including
 * private/collaborative ones — without the read scopes GET /me/playlists
 * can't see them) and create/update playlists. If this list changes,
 * already-connected users must reconnect Spotify to grant the new scopes:
 * their existing refresh token keeps the old grant forever.
 */
export const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
  "user-read-email",
].join(" ");

/**
 * Returns a usable Spotify access token, refreshing it transparently if the
 * access cookie has expired but we still hold a refresh token.
 * Returns null when the user is not connected / cannot be refreshed.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const access = await readAccessToken();
  if (access) return access;

  const refresh = await readRefreshToken();
  if (!refresh) return null;

  try {
    const result = await refreshSpotifyToken(refresh);
    if (result.refreshToken) {
      // Spotify rotated the refresh token — persist both.
      await setTokenCookies(result.accessToken, result.refreshToken, result.expiresIn);
    } else {
      await updateAccessTokenCookie(result.accessToken, result.expiresIn);
    }
    return result.accessToken;
  } catch {
    // Refresh token is invalid — force a clean reconnect.
    await clearTokenCookies();
    return null;
  }
}

/** Whether the user currently has any Spotify session (access or refresh). */
export async function isConnected(): Promise<boolean> {
  return Boolean((await readAccessToken()) || (await readRefreshToken()));
}
