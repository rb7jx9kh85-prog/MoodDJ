// Shared types for Mood DJ.

/**
 * Vocal preference. "whispered-breathy" is a legitimate production/texture
 * choice (ASMR-adjacent, intimate R&B, etc.) — it must never be silently
 * rewritten into "chill" or "romantic" by the generation engine.
 */
export type VocalPreference =
  | "any"
  | "mostly-vocal"
  | "mostly-instrumental"
  | "instrumental-only"
  | "female-vocals"
  | "male-vocals"
  | "mixed-vocals"
  | "duets"
  | "spoken-word"
  | "whispered-breathy";

export type EraPreference =
  | "any"
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s"
  | "current";

export type PopularityPreference = "any" | "mainstream" | "balanced" | "niche" | "underground";

export type DiscoveryLevel = "safe" | "balanced" | "adventurous" | "underground";

export type PlaylistProgression =
  | "stable"
  | "gradual-rise"
  | "gradual-fall"
  | "wave"
  | "slow-burn"
  | "peak-and-release"
  | "cinematic-journey";

/** Structured playlist plan returned by OpenAI from a free-text vibe. */
export type MoodPlan = {
  playlistName: string;
  playlistDescription: string;
  vibe: string;
  scene: string;
  energy: number; // 0-100
  emotionalTone: string[];
  genres: string[];
  searchQueries: string[];
  trackCount: number;
  transitionLogic: string;
  /** 0-100 estimates from the model's musical analysis — heuristics, not measured audio features. */
  danceability: number;
  valence: number;
  darkness: number;
  sensuality: number;
  /** e.g. ["female vocals", "whispered", "layered harmonies"]. */
  vocalStyle: string[];
};

/**
 * User-tunable generation settings sent along with the vibe prompt.
 *
 * Three kinds of fields, by how they're used (see lib/openai.ts):
 * - deterministic (trackCount, includeExplicit, allowRemixes/allowLiveVersions/allowCovers):
 *   enforced in TypeScript/Spotify code, never phrased as a "rule" to the model;
 * - strong musical preferences (energy, danceability, vocalPreference, era, language, ...):
 *   sent to the model as structured data it must respect;
 * - soft preferences (discoveryLevel, variety, progression): the model may
 *   balance these against each other and against the vibe's intent.
 */
export type GenerationOptions = {
  /** Desired playlist length (clamped server-side to 5-30). */
  trackCount: number;
  /** Preferred song language ("auto" lets the AI decide from the vibe). */
  language: string;
  /** Target energy 0-100. */
  energy: number;
  danceability: number;
  emotionalIntensity: number;
  darkness: number;
  sensuality: number;
  positivity: number;
  vocalPreference: VocalPreference;
  era: EraPreference;
  popularity: PopularityPreference;
  discoveryLevel: DiscoveryLevel;
  /** Genre variety 0-100 (0 = tightly homogeneous, 100 = deliberately eclectic). */
  variety: number;
  progression: PlaylistProgression;
  preferredGenres: string[];
  excludedGenres: string[];
  preferredArtists: string[];
  excludedArtists: string[];
  /** Free-text "Artist - Track" references used only to steer groove/production/era, never as a strict artist filter. */
  referenceTracks: string[];
  includeExplicit: boolean;
  allowRemixes: boolean;
  allowLiveVersions: boolean;
  allowCovers: boolean;
  activity: string;
  timeOfDay: string;
  season: string;
  locationAtmosphere: string;
  customInstructions: string;
};

/**
 * The subset of GenerationOptions that's meaningful as musical *intent* for
 * the model — i.e. everything except the deterministic/technical fields
 * (trackCount, includeExplicit, allowRemixes/allowLiveVersions/allowCovers),
 * which are enforced in code instead. Built by buildPreferencePayload().
 */
export type MusicPreferences = {
  targetEnergy: number;
  danceability: number;
  emotionalIntensity: number;
  darkness: number;
  sensuality: number;
  positivity: number;
  vocalPreference: VocalPreference;
  era: EraPreference;
  popularity: PopularityPreference;
  discoveryLevel: DiscoveryLevel;
  variety: number;
  progression: PlaylistProgression;
  language?: string;
  preferredGenres: string[];
  excludedGenres: string[];
  preferredArtists: string[];
  excludedArtists: string[];
  referenceTracks: string[];
  activity?: string;
  timeOfDay?: string;
  season?: string;
  locationAtmosphere?: string;
  customInstructions?: string;
};

/** A single Spotify track, normalised for the frontend. */
export type Track = {
  id: string;
  name: string;
  artist: string;
  /** Raw artist ids, for per-artist diversity capping — not shown in the UI. */
  artistIds?: string[];
  album?: string;
  image?: string;
  spotifyUrl: string;
  uri: string;
  /** 0-100, from Spotify's basic track object (unlike audio-features, still available post Feb-2026 API changes). */
  popularity?: number;
  explicit?: boolean;
};

/** Full payload returned by /api/generate on success. */
export type GeneratedPlaylistResponse = {
  playlistName: string;
  playlistDescription: string;
  vibe: string;
  scene: string;
  energy: number;
  emotionalTone: string[];
  genres: string[];
  transitionLogic: string;
  tracks: Track[];
  /** True once this playlist has actually been created on the user's Spotify account. */
  pushedToSpotify: boolean;
  spotifyPlaylistUrl?: string;
  playlistId?: string;
  /** AI-generated cover art (Firebase Storage URL) — absent if generation failed or is disabled; the UI falls back to a gradient cover. */
  coverImageUrl?: string;
};

/** Payload returned by /api/push-to-spotify on success. */
export type PushToSpotifyResponse = {
  spotifyPlaylistUrl: string;
  playlistId: string;
};

/** A Spotify playlist owned by the connected user, for the "update existing" picker. */
export type OwnedPlaylist = {
  id: string;
  name: string;
  trackCount: number;
  image?: string;
  spotifyUrl: string;
};

/** Error shape returned by API routes. */
export type ApiError = {
  error: string;
  /** Machine-readable code so the frontend can branch (e.g. show "Connect Spotify"). */
  code?: ApiErrorCode;
  /** True when the only way forward is reconnecting the Spotify account. */
  reconnectRequired?: boolean;
};

export type ApiErrorCode =
  | "not_connected"
  | "session_expired"
  | "not_authenticated"
  | "email_not_verified"
  | "rate_limited"
  | "quota_exceeded"
  | "upgrade_required"
  | "empty_prompt"
  | "prompt_too_long"
  | "openai_error"
  | "spotify_error"
  | "spotify_reauth_required"
  | "spotify_insufficient_scope"
  | "spotify_not_registered"
  | "spotify_rate_limited"
  | "spotify_playlist_create_failed"
  | "spotify_tracks_add_failed"
  | "spotify_playlists_list_failed"
  | "no_tracks"
  | "playlist_partial"
  | "invalid_tracks"
  | "unknown";
