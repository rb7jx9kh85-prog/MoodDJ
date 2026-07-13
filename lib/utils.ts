/** Tiny className combiner (no extra dependency). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Maximum length we accept for a user vibe prompt. */
export const MAX_PROMPT_LENGTH = 500;

// Matches ASCII control characters (NUL through US, plus DEL) without
// embedding literal control bytes in the source file.
// eslint-disable-next-line no-control-regex
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

import type { GenerationOptions } from "@/types";

/** Song languages the generation options UI offers ("auto" = AI decides). */
export const SONG_LANGUAGES = ["auto", "en", "fr", "de", "es", "pt", "it"] as const;

export const MIN_TRACK_COUNT = 5;
export const MAX_TRACK_COUNT = 30;

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  trackCount: 15,
  language: "auto",
  energy: 60,
};

/** Never trust client-sent options — clamp/whitelist everything server-side. */
export function sanitizeGenerationOptions(raw: unknown): GenerationOptions {
  const r = (raw ?? {}) as Record<string, unknown>;

  const trackCountNum = typeof r.trackCount === "number" ? Math.round(r.trackCount) : NaN;
  const trackCount = Number.isFinite(trackCountNum)
    ? Math.min(MAX_TRACK_COUNT, Math.max(MIN_TRACK_COUNT, trackCountNum))
    : DEFAULT_GENERATION_OPTIONS.trackCount;

  const language =
    typeof r.language === "string" && (SONG_LANGUAGES as readonly string[]).includes(r.language)
      ? r.language
      : DEFAULT_GENERATION_OPTIONS.language;

  const energyNum = typeof r.energy === "number" ? Math.round(r.energy) : NaN;
  const energy = Number.isFinite(energyNum)
    ? Math.min(100, Math.max(0, energyNum))
    : DEFAULT_GENERATION_OPTIONS.energy;

  return { trackCount, language, energy };
}

/** Deduplicate tracks by Spotify URI, preserving order. */
export function dedupeByUri<T extends { uri: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item.uri || seen.has(item.uri)) continue;
    seen.add(item.uri);
    out.push(item);
  }
  return out;
}

/** Shuffle in place (Fisher–Yates) and return the array for convenience. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
