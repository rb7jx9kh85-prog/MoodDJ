// Shared types for Mood DJ.

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
};

/** User-tunable generation settings sent along with the vibe prompt. */
export type GenerationOptions = {
  /** Desired playlist length (clamped server-side to 5-30). */
  trackCount: number;
  /** Preferred song language ("auto" lets the AI decide from the vibe). */
  language: string;
  /** Target energy 0-100. */
  energy: number;
};

/** A single Spotify track, normalised for the frontend. */
export type Track = {
  id: string;
  name: string;
  artist: string;
  album?: string;
  image?: string;
  spotifyUrl: string;
  uri: string;
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
