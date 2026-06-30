import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

// Cookie names used across the OAuth flow.
export const ACCESS_TOKEN_COOKIE = "sp_access_token";
export const REFRESH_TOKEN_COOKIE = "sp_refresh_token";
export const STATE_COOKIE = "sp_oauth_state";

const isProd = process.env.NODE_ENV === "production";

/** Base options for secure, server-only cookies. */
function baseOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Sign a value with COOKIE_SECRET so we can verify it later (used for OAuth state). */
export function signState(value: string): string {
  const secret = process.env.COOKIE_SECRET || "dev-secret";
  const sig = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${sig}`;
}

/** Verify a signed state value in constant time. Returns the raw value or null. */
export function verifyState(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const secret = process.env.COOKIE_SECRET || "dev-secret";
  const expected = createHmac("sha256", secret).update(value).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? value : null;
  } catch {
    return null;
  }
}

export async function setStateCookie(state: string) {
  const store = await cookies();
  store.set(STATE_COOKIE, signState(state), {
    ...baseOptions(),
    maxAge: 60 * 10, // 10 minutes is plenty for the OAuth round-trip
  });
}

export async function readStateCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(STATE_COOKIE)?.value;
}

export async function clearStateCookie() {
  const store = await cookies();
  store.delete(STATE_COOKIE);
}

export async function setTokenCookies(accessToken: string, refreshToken: string, expiresIn: number) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions(),
    // Refresh slightly before Spotify expiry (default 3600s).
    maxAge: Math.max(60, expiresIn - 60),
  });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions(),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Update just the access token (after a refresh) without touching the refresh token. */
export async function updateAccessTokenCookie(accessToken: string, expiresIn: number) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions(),
    maxAge: Math.max(60, expiresIn - 60),
  });
}

export async function clearTokenCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function readAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function readRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}
