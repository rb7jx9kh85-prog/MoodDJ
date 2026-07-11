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
  | "no_tracks"
  | "playlist_partial"
  | "invalid_tracks"
  | "unknown";
