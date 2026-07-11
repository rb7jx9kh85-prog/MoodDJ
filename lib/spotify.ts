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
  constructor(message: string, status: number) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
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
    throw new SpotifyApiError("Could not load Spotify profile", res.status);
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
    throw new SpotifyApiError("Spotify search failed", res.status);
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
    throw new SpotifyApiError("Could not create playlist", res.status);
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
      throw new SpotifyApiError("Could not add tracks to playlist", res.status);
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
