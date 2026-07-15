import type { GenerationOptions, PlaylistProgression, Track } from "@/types";

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
  artists: Array<{ id: string; name: string }>;
  album?: { name: string; images?: Array<{ url: string }> };
  /** Still exposed on the basic track object — unlike audio-features, this survived the Feb 2026 API changes. */
  popularity?: number;
  explicit?: boolean;
};

function normalizeTrack(t: SpotifyTrackItem): Track {
  return {
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    artistIds: t.artists.map((a) => a.id).filter(Boolean),
    album: t.album?.name,
    image: t.album?.images?.[0]?.url,
    spotifyUrl: t.external_urls.spotify,
    uri: t.uri,
    popularity: typeof t.popularity === "number" ? t.popularity : undefined,
    explicit: typeof t.explicit === "boolean" ? t.explicit : undefined,
  };
}

// Spotify's February 2026 API changes cut GET /search's `limit` max from
// 50 to 10 (default 20 -> 5). A request above 10 now fails outright, so
// every query silently returning zero results (via the caller's .catch())
// used to look exactly like "no matching tracks" instead of a bad request.
export const MAX_SEARCH_LIMIT = 10;

/** Search Spotify for tracks matching a query. */
export async function searchTracks(
  accessToken: string,
  query: string,
  limit = 8
): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(Math.min(Math.max(limit, 1), MAX_SEARCH_LIMIT)),
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

/**
 * Create a playlist for the connected user. Spotify's February 2026 Web API
 * changes removed `POST /users/{user_id}/playlists` entirely — creation is
 * now always for the current user, via `POST /me/playlists`.
 */
export async function createPlaylist(
  accessToken: string,
  name: string,
  description: string
): Promise<{ id: string; url: string }> {
  const res = await spotifyFetch(accessToken, `/me/playlists`, {
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
    // Spotify's February 2026 Web API changes renamed this endpoint from
    // /tracks to /items (same for the PUT below).
    const res = await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
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
  /** Renamed to `items` by Spotify's February 2026 Web API changes; `tracks` kept for safety. */
  items?: { total: number };
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
      trackCount: p.items?.total ?? p.tracks?.total ?? 0,
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
  const res = await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
    method: "PUT",
    body: JSON.stringify({ uris: first }),
  });
  if (!res.ok) {
    throw await toApiError(res, "Could not update playlist");
  }

  for (let i = 100; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const appendRes = await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ uris: batch }),
    });
    if (!appendRes.ok) {
      throw await toApiError(appendRes, "Could not update playlist");
    }
  }
}

/**
 * Sets a playlist's cover image (our AI-generated art). Requires the
 * `ugc-image-upload` scope — already-connected users must reconnect Spotify
 * to grant it; until then this throws SpotifyApiError(403, insufficient
 * scope), which callers treat as best-effort and swallow.
 *
 * `base64Jpeg` must be JPEG data, ≤256KB once base64-encoded (Spotify's
 * hard limit — see lib/cover-art.ts's toSpotifySafeJpegBase64).
 */
export async function setPlaylistCoverImage(
  accessToken: string,
  playlistId: string,
  base64Jpeg: string
): Promise<void> {
  const res = await spotifyFetch(accessToken, `/playlists/${playlistId}/images`, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: base64Jpeg,
  });
  if (!res.ok) {
    throw await toApiError(res, "Could not set playlist cover image");
  }
}

const LIVE_PATTERN = /\(live[^)]*\)|\blive at\b|\blive from\b|\blive in\b/i;
const REMIX_PATTERN = /\bremix\b|\bre-?edit\b|\bmashup\b/i;
const COVER_PATTERN = /\bcover\b|tribute to|as made famous by|karaoke/i;

/**
 * Hard, deterministic filters derived from the user's technical toggles
 * (explicit/remix/live/cover, excluded artists). These are never phrased as
 * instructions to the model — they're applied here, after the fact, on real
 * track metadata.
 */
export function applyHardFilters(
  candidates: Track[],
  options: Pick<
    GenerationOptions,
    "includeExplicit" | "allowRemixes" | "allowLiveVersions" | "allowCovers" | "excludedArtists"
  >
): Track[] {
  const excludedArtists = options.excludedArtists.map((a) => a.toLowerCase());
  return candidates.filter((t) => {
    if (!options.includeExplicit && t.explicit) return false;
    if (!options.allowRemixes && REMIX_PATTERN.test(t.name)) return false;
    if (!options.allowLiveVersions && LIVE_PATTERN.test(t.name)) return false;
    if (!options.allowCovers && COVER_PATTERN.test(t.name)) return false;
    if (excludedArtists.length > 0) {
      const artistLower = t.artist.toLowerCase();
      if (excludedArtists.some((a) => artistLower.includes(a))) return false;
    }
    return true;
  });
}

/**
 * Score + greedily select up to `targetCount` tracks from deduped, filtered
 * candidates, favoring: Spotify's own relevance ranking (position within its
 * source query's results), popularity alignment with the user's preference,
 * and artist diversity (capped repeats per artist). This intentionally does
 * NOT use audio-features data (energy, danceability, BPM, ...) — Spotify
 * deprecated those endpoints for Development Mode apps in February 2026, so
 * there is no reliable per-track measurement of them to score against.
 */
export function curateTracks(
  candidates: Array<{ track: Track; queryRank: number }>,
  options: Pick<GenerationOptions, "popularity">,
  targetCount: number
): Track[] {
  const maxPerArtist = Math.max(2, Math.ceil(targetCount / 6));
  const artistCounts = new Map<string, number>();
  const artistKey = (t: Track) => t.artistIds?.[0] ?? t.artist;

  const scored = candidates.map((c) => {
    let score = Math.max(0, 10 - c.queryRank);
    const pop = c.track.popularity ?? 50;
    if (options.popularity === "mainstream") score += pop / 10;
    else if (options.popularity === "underground") score += (100 - pop) / 8;
    else if (options.popularity === "niche") score += (100 - pop) / 15;
    return { ...c, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const selected: Track[] = [];
  for (const c of scored) {
    if (selected.length >= targetCount) break;
    const key = artistKey(c.track);
    const count = artistCounts.get(key) ?? 0;
    if (count >= maxPerArtist) continue;
    selected.push(c.track);
    artistCounts.set(key, count + 1);
  }

  // If the diversity cap left us short (e.g. very few unique artists in the
  // candidate pool), top up from the remaining scored tracks regardless of
  // the cap rather than under-deliver on the requested count.
  if (selected.length < targetCount) {
    const selectedUris = new Set(selected.map((t) => t.uri));
    for (const c of scored) {
      if (selected.length >= targetCount) break;
      if (selectedUris.has(c.track.uri)) continue;
      selected.push(c.track);
      selectedUris.add(c.track.uri);
    }
  }

  return selected;
}

/**
 * Reorder the final track selection to match the requested playlist
 * progression. Uses Spotify's `popularity` field as the only reliable
 * per-track numeric signal available (real energy/audio-features data isn't
 * exposed to Development Mode apps anymore) — a heuristic proxy, not a
 * measurement of actual musical energy.
 */
export function orderByProgression(tracks: Track[], progression: PlaylistProgression): Track[] {
  if (tracks.length <= 2 || progression === "stable") return tracks;

  const byPopularityAsc = [...tracks].sort(
    (a, b) => (a.popularity ?? 50) - (b.popularity ?? 50)
  );
  const byPopularityDesc = [...byPopularityAsc].reverse();

  switch (progression) {
    case "gradual-rise":
    case "slow-burn":
      return byPopularityAsc;
    case "gradual-fall":
      return byPopularityDesc;
    case "peak-and-release":
    case "cinematic-journey": {
      // Build up then release: ascending into the middle, descending after.
      const mid = Math.ceil(byPopularityAsc.length / 2);
      const rising = byPopularityAsc.slice(0, mid);
      const falling = byPopularityDesc.slice(byPopularityDesc.length - (tracks.length - mid));
      return [...rising, ...falling];
    }
    case "wave": {
      // Interleave low/high popularity for a rise-fall-rise feel.
      const out: Track[] = [];
      let lo = 0;
      let hi = byPopularityAsc.length - 1;
      let takeLow = true;
      while (lo <= hi) {
        if (takeLow) {
          out.push(byPopularityAsc[lo++]);
        } else {
          out.push(byPopularityAsc[hi--]);
        }
        takeLow = !takeLow;
      }
      return out;
    }
    default:
      return tracks;
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
