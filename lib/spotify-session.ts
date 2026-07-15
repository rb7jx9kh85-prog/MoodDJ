import { NextResponse } from "next/server";
import type { ApiError, ApiErrorCode } from "@/types";
import {
  readRefreshToken,
  setTokenCookies,
  updateAccessTokenCookie,
  clearTokenCookies,
  readTokenOwner,
} from "@/lib/cookies";
import {
  refreshSpotifyToken,
  SpotifyAuthError,
  SpotifyApiError,
  isInsufficientScope,
  isUserNotRegistered,
} from "@/lib/spotify";

/**
 * Run a Spotify operation with a *user* access token, transparently
 * refreshing once (grant_type=refresh_token) if Spotify rejects the token
 * mid-request. Keeps the existing refresh token when Spotify doesn't rotate
 * it. Previously duplicated in /api/generate and /api/push-to-spotify.
 */
export async function withFreshToken<T>(
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
      const ownerUid = await readTokenOwner();
      if (!ownerUid) throw err;
      await setTokenCookies(refreshed.accessToken, refreshed.refreshToken, refreshed.expiresIn, ownerUid);
    } else {
      await updateAccessTokenCookie(refreshed.accessToken, refreshed.expiresIn);
    }
    return op(refreshed.accessToken);
  }
}

type SpotifyFailureContext = {
  /** Route tag for server logs, e.g. "/api/push-to-spotify". */
  route: string;
  /** Firebase UID — only its first 6 chars are ever logged. */
  uid?: string;
  /** Code + user-facing message when nothing more specific matches. */
  fallbackCode: ApiErrorCode;
  fallbackMessage: string;
};

/**
 * Translate a caught Spotify failure into a structured JSON error response,
 * logging safe diagnostics (truncated uid, HTTP status, Spotify's own error
 * message — never tokens) so production logs show the real cause instead of
 * a generic string.
 */
export async function spotifyFailureResponse(
  err: unknown,
  ctx: SpotifyFailureContext
): Promise<NextResponse> {
  const uidTag = ctx.uid ? ctx.uid.slice(0, 6) : "anon";

  if (err instanceof SpotifyAuthError) {
    // Refresh either wasn't possible or itself failed (invalid_grant).
    await clearTokenCookies();
    console.error(`[${ctx.route}] Spotify auth failed`, { uid: uidTag, kind: "auth" });
    return errorJson(
      "Your Spotify session expired. Please reconnect Spotify.",
      "spotify_reauth_required",
      401,
      true
    );
  }

  if (err instanceof SpotifyApiError) {
    console.error(`[${ctx.route}] Spotify API error`, {
      uid: uidTag,
      status: err.status,
      spotifyMessage: err.spotifyMessage ?? "(no body)",
      spotifyReason: err.spotifyReason ?? null,
      wwwAuthenticate: err.wwwAuthenticate ?? null,
      retryAfter: err.retryAfter,
    });

    if (isInsufficientScope(err)) {
      return errorJson(
        "Your Spotify connection is missing permissions. Please reconnect Spotify to grant them.",
        "spotify_insufficient_scope",
        403,
        true
      );
    }
    if (isUserNotRegistered(err)) {
      return errorJson(
        "This Spotify app is in Development Mode and your Spotify account isn't authorized on it yet. Add (and accept) this account in the Spotify Developer Dashboard, then reconnect.",
        "spotify_not_registered",
        403,
        true
      );
    }
    if (err.status === 429) {
      const wait = err.retryAfter ? ` Try again in ~${err.retryAfter}s.` : " Try again in a moment.";
      return errorJson(`Spotify is rate-limiting requests.${wait}`, "spotify_rate_limited", 429);
    }
    return errorJson(ctx.fallbackMessage, ctx.fallbackCode, 502);
  }

  console.error(`[${ctx.route}] Unexpected error`, {
    uid: uidTag,
    message: (err as Error)?.message,
  });
  return errorJson(ctx.fallbackMessage, ctx.fallbackCode, 502);
}

export function errorJson(
  message: string,
  code: ApiErrorCode,
  status: number,
  reconnectRequired?: boolean
): NextResponse {
  const body: ApiError = { error: message, code };
  if (reconnectRequired) body.reconnectRequired = true;
  return NextResponse.json(body, { status });
}
