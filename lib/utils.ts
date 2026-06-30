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
