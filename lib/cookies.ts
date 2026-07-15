import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Cookie names used across the OAuth flow.
export const ACCESS_TOKEN_COOKIE = "sp_access_token";
export const REFRESH_TOKEN_COOKIE = "sp_refresh_token";
export const STATE_COOKIE = "sp_oauth_state";
export const OWNER_COOKIE = "sp_owner_uid";

const isProd = process.env.NODE_ENV === "production";

function cookieSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProd) {
    throw new Error("COOKIE_SECRET must be configured with at least 32 characters in production.");
  }
  return secret || "mood-dj-local-development-secret-only";
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(cookieSecret()).digest();
}

function seal(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function open(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const payload = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}

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
  const secret = cookieSecret();
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
  const secret = cookieSecret();
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

export async function setTokenCookies(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  ownerUid: string
) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, seal(accessToken), {
    ...baseOptions(),
    // Refresh slightly before Spotify expiry (default 3600s).
    maxAge: Math.max(60, expiresIn - 60),
  });
  store.set(REFRESH_TOKEN_COOKIE, seal(refreshToken), {
    ...baseOptions(),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  store.set(OWNER_COOKIE, signState(ownerUid), {
    ...baseOptions(),
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Update just the access token (after a refresh) without touching the refresh token. */
export async function updateAccessTokenCookie(accessToken: string, expiresIn: number) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, seal(accessToken), {
    ...baseOptions(),
    maxAge: Math.max(60, expiresIn - 60),
  });
}

export async function clearTokenCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  store.delete(OWNER_COOKIE);
}

export async function readAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return open(store.get(ACCESS_TOKEN_COOKIE)?.value);
}

export async function readRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return open(store.get(REFRESH_TOKEN_COOKIE)?.value);
}

export async function readTokenOwner(): Promise<string | null> {
  const store = await cookies();
  return verifyState(store.get(OWNER_COOKIE)?.value);
}
