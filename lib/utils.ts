/** Tiny className combiner (no extra dependency). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Maximum length we accept for a user vibe prompt. */
export const MAX_PROMPT_LENGTH = 2000;

// Matches ASCII control characters (NUL through US, plus DEL) without
// embedding literal control bytes in the source file.
const CONTROL_CHARS = new RegExp("[\\x00-\\x1F\\x7F]", "g");

/**
 * Sanitise a free-text prompt before sending it to OpenAI.
 * Strips control characters, collapses whitespace and clamps the length.
 */
export function sanitizePrompt(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_LENGTH);
}

import type {
  GenerationOptions,
  VocalPreference,
  EraPreference,
  PopularityPreference,
  DiscoveryLevel,
  PlaylistProgression,
} from "@/types";

/** Song languages the generation options UI offers ("auto" = AI decides). */
export const SONG_LANGUAGES = ["auto", "en", "fr", "de", "es", "pt", "it"] as const;

export const MIN_TRACK_COUNT = 5;
export const MAX_TRACK_COUNT = 30;

export const VOCAL_PREFERENCES: readonly VocalPreference[] = [
  "any",
  "mostly-vocal",
  "mostly-instrumental",
  "instrumental-only",
  "female-vocals",
  "male-vocals",
  "mixed-vocals",
  "duets",
  "spoken-word",
  "whispered-breathy",
];

export const ERA_PREFERENCES: readonly EraPreference[] = [
  "any",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
  "current",
];

export const POPULARITY_PREFERENCES: readonly PopularityPreference[] = [
  "any",
  "mainstream",
  "balanced",
  "niche",
  "underground",
];

export const DISCOVERY_LEVELS: readonly DiscoveryLevel[] = [
  "safe",
  "balanced",
  "adventurous",
  "underground",
];

export const PLAYLIST_PROGRESSIONS: readonly PlaylistProgression[] = [
  "stable",
  "gradual-rise",
  "gradual-fall",
  "wave",
  "slow-burn",
  "peak-and-release",
  "cinematic-journey",
];

/** Limits shared by the UI, the API route and OpenAI-facing validation. */
export const MAX_GENRE_TAGS = 8;
export const MAX_ARTIST_TAGS = 8;
export const MAX_REFERENCE_TRACKS = 5;
export const MAX_TAG_LENGTH = 60;
export const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 300;
export const MAX_CONTEXT_FIELD_LENGTH = 60;

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  trackCount: 15,
  language: "auto",
  energy: 60,
  danceability: 50,
  emotionalIntensity: 50,
  darkness: 30,
  sensuality: 20,
  positivity: 55,
  vocalPreference: "any",
  era: "any",
  popularity: "balanced",
  discoveryLevel: "balanced",
  variety: 50,
  progression: "wave",
  preferredGenres: [],
  excludedGenres: [],
  preferredArtists: [],
  excludedArtists: [],
  referenceTracks: [],
  includeExplicit: true,
  allowRemixes: true,
  allowLiveVersions: true,
  allowCovers: true,
  activity: "",
  timeOfDay: "",
  season: "",
  locationAtmosphere: "",
  customInstructions: "",
};

/** Clamp a 0-100 slider value, tolerant of strings/floats/out-of-range input. */
export function clampPercentage(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Clamp a requested playlist length to the app's real supported range. */
export function clampTrackCount(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_TRACK_COUNT, Math.max(MIN_TRACK_COUNT, Math.round(n)));
}

/** Trim, collapse whitespace and cap the length of a free-text field. */
export function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Clean a list of free-text tags (genres, artists, reference tracks, ...). */
export function cleanStringArray(
  value: unknown,
  options: { maxItems: number; maxItemLength: number; fallback?: string[] }
): string[] {
  if (!Array.isArray(value)) return options.fallback ?? [];
  const cleaned = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => cleanString(v, options.maxItemLength))
    .filter((v) => v.length > 0);
  return cleaned.slice(0, options.maxItems);
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Never trust client-sent options — clamp/whitelist everything server-side. */
export function sanitizeGenerationOptions(raw: unknown): GenerationOptions {
  const r = (raw ?? {}) as Record<string, unknown>;
  const d = DEFAULT_GENERATION_OPTIONS;

  const language =
    typeof r.language === "string" && (SONG_LANGUAGES as readonly string[]).includes(r.language)
      ? r.language
      : d.language;

  return {
    trackCount: clampTrackCount(r.trackCount, d.trackCount),
    language,
    energy: clampPercentage(r.energy, d.energy),
    danceability: clampPercentage(r.danceability, d.danceability),
    emotionalIntensity: clampPercentage(r.emotionalIntensity, d.emotionalIntensity),
    darkness: clampPercentage(r.darkness, d.darkness),
    sensuality: clampPercentage(r.sensuality, d.sensuality),
    positivity: clampPercentage(r.positivity, d.positivity),
    vocalPreference: oneOf(VOCAL_PREFERENCES, r.vocalPreference, d.vocalPreference),
    era: oneOf(ERA_PREFERENCES, r.era, d.era),
    popularity: oneOf(POPULARITY_PREFERENCES, r.popularity, d.popularity),
    discoveryLevel: oneOf(DISCOVERY_LEVELS, r.discoveryLevel, d.discoveryLevel),
    variety: clampPercentage(r.variety, d.variety),
    progression: oneOf(PLAYLIST_PROGRESSIONS, r.progression, d.progression),
    preferredGenres: cleanStringArray(r.preferredGenres, {
      maxItems: MAX_GENRE_TAGS,
      maxItemLength: MAX_TAG_LENGTH,
    }),
    excludedGenres: cleanStringArray(r.excludedGenres, {
      maxItems: MAX_GENRE_TAGS,
      maxItemLength: MAX_TAG_LENGTH,
    }),
    preferredArtists: cleanStringArray(r.preferredArtists, {
      maxItems: MAX_ARTIST_TAGS,
      maxItemLength: MAX_TAG_LENGTH,
    }),
    excludedArtists: cleanStringArray(r.excludedArtists, {
      maxItems: MAX_ARTIST_TAGS,
      maxItemLength: MAX_TAG_LENGTH,
    }),
    referenceTracks: cleanStringArray(r.referenceTracks, {
      maxItems: MAX_REFERENCE_TRACKS,
      maxItemLength: MAX_TAG_LENGTH,
    }),
    includeExplicit: typeof r.includeExplicit === "boolean" ? r.includeExplicit : d.includeExplicit,
    allowRemixes: typeof r.allowRemixes === "boolean" ? r.allowRemixes : d.allowRemixes,
    allowLiveVersions:
      typeof r.allowLiveVersions === "boolean" ? r.allowLiveVersions : d.allowLiveVersions,
    allowCovers: typeof r.allowCovers === "boolean" ? r.allowCovers : d.allowCovers,
    activity: cleanString(r.activity, MAX_CONTEXT_FIELD_LENGTH),
    timeOfDay: cleanString(r.timeOfDay, MAX_CONTEXT_FIELD_LENGTH),
    season: cleanString(r.season, MAX_CONTEXT_FIELD_LENGTH),
    locationAtmosphere: cleanString(r.locationAtmosphere, MAX_CONTEXT_FIELD_LENGTH),
    customInstructions: cleanString(r.customInstructions, MAX_CUSTOM_INSTRUCTIONS_LENGTH),
  };
}
