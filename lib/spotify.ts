import type { Track } from "@/types";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com/api/token";

/** Thrown when Spotify returns a 401 so callers can attempt a token refresh. */
export class SpotifyAuthError extends Error {
  constructor(message = "Spotify authorization failed") {
    super(message);
    this.name = "SpotifyAuthError";
  }
}

/** Generic Spotify API failure (non-401). */
export class SpotifyApiError extends Error {
  status: number;
  /** Error message from Spotify's response body, when readable. */
  spotifyMessage?: string;
  /** Machine-readable reason code Spotify sometimes includes (e.g. player errors). */
  spotifyReason?: string;
  /** The WWW-Authenticate response header, when Spotify sends one (often carries the real cause on 401/403). */
  wwwAuthenticate?: string;
  /** Seconds to wait (from Retry-After) when status is 429. */
  retryAfter?: number;
  constructor(
    message: string,
    status: number,
    spotifyMessage?: string,
    retryAfter?: number,
    spotifyReason?: string,
    wwwAuthenticate?: string
  ) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.spotifyMessage = spotifyMessage;
    this.retryAfter = retryAfter;
    this.spotifyReason = spotifyReason;
    this.wwwAuthenticate = wwwAuthenticate;
  }
}

/**
 * Build a SpotifyApiError that preserves Spotify's own error message and the
 * Retry-After header. Without this, a 403 "Insufficient client scope" and a
 * 403 "User not registered in the Developer Dashboard" (Development Mode)
 * are indistinguishable in logs — which is exactly what made the playlist
 * failures undiagnosable.
 */
async function toApiError(res: Response, message: string): Promise<SpotifyApiError> {
  let spotifyMessage: string | undefined;
  let spotifyReason: string | undefined;
  try {
    const body = (await res.json()) as {
      error?: { message?: string; reason?: string } | string;
    };
    spotifyMessage = typeof body?.error === "string" ? body.error : body?.error?.message;
    spotifyReason = typeof body?.error === "object" ? body.error?.reason : undefined;
  } catch {
    /* non-JSON body — keep undefined */
  }
  const retryAfterRaw = res.status === 429 ? Number(res.headers.get("Retry-After")) : NaN;
  const retryAfter = Number.isFinite(retryAfterRaw) ? retryAfterRaw : undefined;
  // On 401/403 Spotify sometimes puts the real cause here (e.g. `Bearer
  // error="insufficient_scope"`) even when the JSON body is a bare
  // "Forbidden" with no further detail.
  const wwwAuthenticate = res.headers.get("www-authenticate") ?? undefined;
  return new SpotifyApiError(message, res.status, spotifyMessage, retryAfter, spotifyReason, wwwAuthenticate);
}

/** 403 with Spotify's "Insufficient client scope" — token lacks a required scope. */
export function isInsufficientScope(err: unknown): boolean {
  return (
    err instanceof SpotifyApiError &&
    err.status === 403 &&
    (/insufficient client scope/i.test(err.spotifyMessage ?? "") ||
      /insufficient_scope/i.test(err.wwwAuthenticate ?? ""))
  );
}

/** 403 for a user not allow-listed on a Development Mode Spotify app. */
export function isUserNotRegistered(err: unknown): boolean {
  return (
    err instanceof SpotifyApiError &&
    err.status === 403 &&
    /not (be )?registered|development mode/i.test(err.spotifyMessage ?? "")
  );
}

async function spotifyFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new SpotifyAuthError();
  }
  return res;
}

export type SpotifyUser = {
  id: string;
  display_name: string | null;
  email?: string;
};

/** Fetch the connected Spotify user's profile. */
export async function getSpotifyMe(accessToken: string): Promise<SpotifyUser> {
  const res = await spotifyFetch(accessToken, "/me");
  if (!res.ok) {
    throw await toApiError(res, "Could not load Spotify profile");
  }
  return (await res.json()) as SpotifyUser;
}

type SpotifyTrackItem = {
  id: string;
  name: string;
  uri: string;
  external_urls: { spotify: string };
  artists: Array<{ name: string }>;
  album?: { name: string; images?: Array<{ url: string }> };
};

function normalizeTrack(t: SpotifyTrackItem): Track {
  return {
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album?.name,
    image: t.album?.images?.[0]?.url,
    spotifyUrl: t.external_urls.spotify,
    uri: t.uri,
  };
}

/** Search Spotify for tracks matching a query. */
export async function searchTracks(
  accessToken: string,
  query: string,
  limit = 8
): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(Math.min(Math.max(limit, 1), 50)),
  });
  const res = await spotifyFetch(accessToken, `/search?${params.toString()}`);
  if (!res.ok) {
    throw await toApiError(res, "Spotify search failed");
  }
  const data = (await res.json()) as {
    tracks?: { items?: SpotifyTrackItem[] };
  };
  const items = data.tracks?.items ?? [];
  return items.filter((t) => t && t.uri).map(normalizeTrack);
}

type SpotifyPlaylist = {
  id: string;
  external_urls: { spotify: string };
};

/** Create a playlist on the user's account. */
export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string
): Promise<{ id: string; url: string }> {
  const res = await spotifyFetch(accessToken, `/users/${encodeURIComponent(userId)}/playlists`, {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      public: false,
    }),
  });
  if (!res.ok) {
    throw await toApiError(res, "Could not create playlist");
  }
  const data = (await res.json()) as SpotifyPlaylist;
  return { id: data.id, url: data.external_urls.spotify };
}

/** Add tracks to a playlist (handles the 100-URI batch limit). */
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const res = await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: batch }),
    });
    if (!res.ok) {
      throw await toApiError(res, "Could not add tracks to playlist");
    }
  }
}

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  images?: Array<{ url: string }>;
  tracks?: { total: number };
  external_urls?: { spotify: string };
  owner?: { id: string };
};

/** List playlists owned by the connected user (for the "update existing" picker). */
export async function listOwnedPlaylists(
  accessToken: string,
  userId: string
): Promise<Array<{ id: string; name: string; trackCount: number; image?: string; spotifyUrl: string }>> {
  const all: SpotifyPlaylistItem[] = [];
  let url = "/me/playlists?limit=50";
  while (url) {
    const res = await spotifyFetch(accessToken, url);
    if (!res.ok) {
      throw await toApiError(res, "Could not load your Spotify playlists");
    }
    const data = (await res.json()) as { items: (SpotifyPlaylistItem | null)[]; next: string | null };
    all.push(...data.items.filter((p): p is SpotifyPlaylistItem => Boolean(p)));
    url = data.next ? data.next.replace(SPOTIFY_API, "") : "";
  }

  // Spotify's /me/playlists can return items missing `tracks`/`external_urls`
  // (seen in production for certain algorithmic/orphaned library entries) —
  // never crash the whole list over one malformed entry.
  return all
    .filter((p) => p.owner?.id === userId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      trackCount: p.tracks?.total ?? 0,
      image: p.images?.[0]?.url,
      spotifyUrl: p.external_urls?.spotify ?? "",
    }));
}

/**
 * Replace all tracks in an existing playlist with a new set (handles the
 * 100-URI batch limit: first batch replaces, the rest are appended).
 */
export async function replacePlaylistTracks(
  accessToken: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  const first = uris.slice(0, 100);
  const res = await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
    method: "PUT",
    body: JSON.stringify({ uris: first }),
  });
  if (!res.ok) {
    throw await toApiError(res, "Could not update playlist");
  }

  for (let i = 100; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const appendRes = await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: batch }),
    });
    if (!appendRes.ok) {
      throw await toApiError(appendRes, "Could not update playlist");
    }
  }
}

let appToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * App-only token via the Client Credentials flow — no user has to connect
 * Spotify for this. Only works for public catalog reads (search), never for
 * writes like creating a playlist. Cached in-memory per serverless instance
 * and refreshed a minute before expiry.
 */
export async function getAppAccessToken(): Promise<string> {
  if (appToken && appToken.expiresAt > Date.now()) {
    return appToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_ACCOUNTS, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SpotifyAuthError("Could not get an app access token");
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  appToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return appToken.accessToken;
}

export type RefreshResult = {
  accessToken: string;
  expiresIn: number;
  /** Spotify may or may not return a new refresh token. */
  refreshToken?: string;
};

/** Exchange a refresh token for a fresh access token. */
export async function refreshSpotifyToken(refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_ACCOUNTS, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SpotifyAuthError("Could not refresh Spotify token");
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

/** Exchange an authorization code for access + refresh tokens. */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_ACCOUNTS, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SpotifyAuthError("Could not exchange authorization code");
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
