import OpenAI from "openai";
import type { GenerationOptions, MoodPlan } from "@/types";
import { MAX_PROMPT_LENGTH } from "@/lib/utils";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
  it: "Italian",
};

/**
 * Extra hard constraints derived from the user's generation settings.
 * These are appended to the SYSTEM prompt (server-sanitized values only),
 * never mixed into the untrusted user text.
 */
function optionConstraints(options?: GenerationOptions): string {
  if (!options) return "";
  const lines = [
    `- trackCount must be exactly ${options.trackCount}.`,
    `- energy must be ${options.energy} (match the plan's mood to this target).`,
  ];
  const languageName = LANGUAGE_NAMES[options.language];
  if (languageName) {
    lines.push(
      `- The listener wants songs primarily sung in ${languageName}. Every search query must target ${languageName}-language music (mention the language or its music scene in the queries).`
    );
  }
  return `\n\nHard constraints from the user's settings (override anything the vibe implies):\n${lines.join("\n")}`;
}

// ── Model selection ──────────────────────────────────────────────────────────
// Change this single constant to swap the model. gpt-4o-mini is recent, cheap
// and supports strict JSON responses, which is all Mood DJ needs.
const OPENAI_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are Mood DJ, an expert music curator. Your job is to transform a user's scene, emotion or vibe into a structured playlist plan. You must output strict JSON only. You understand music moods, transitions, tempo, energy, listening context and cinematic sequencing. Never include explanations outside JSON.

Return JSON with exactly these keys:
- playlistName: string (short, evocative, max ~40 chars)
- playlistDescription: string (one cinematic sentence)
- vibe: string (a few words)
- scene: string (the listening context)
- energy: number (0-100)
- emotionalTone: string[] (3-5 adjectives)
- genres: string[] (3-6 music genres)
- searchQueries: string[] (5-8 Spotify search queries blending genre + mood; do NOT include artist-only queries)
- trackCount: number (12-20)
- transitionLogic: string (how the playlist flows from start to end)`;

export class OpenAIGenerationError extends Error {
  constructor(message = "OpenAI generation failed") {
    super(message);
    this.name = "OpenAIGenerationError";
  }
}

function clampEnergy(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return cleaned.length > 0 ? cleaned : fallback;
}

/** Validate and normalise a raw object into a MoodPlan. Throws if unusable. */
function validateMoodPlan(
  raw: unknown,
  userPrompt: string,
  options?: GenerationOptions
): MoodPlan {
  if (!raw || typeof raw !== "object") {
    throw new OpenAIGenerationError("Malformed plan");
  }
  const r = raw as Record<string, unknown>;
  const searchQueries = asStringArray(r.searchQueries, []);
  if (searchQueries.length === 0) {
    throw new OpenAIGenerationError("Plan has no search queries");
  }
  const trackCount = clampEnergy(r.trackCount);
  return {
    playlistName:
      typeof r.playlistName === "string" && r.playlistName.trim()
        ? r.playlistName.trim().slice(0, 80)
        : "Mood DJ Mix",
    playlistDescription:
      typeof r.playlistDescription === "string" && r.playlistDescription.trim()
        ? r.playlistDescription.trim().slice(0, 280)
        : `A playlist for: ${userPrompt}`,
    vibe: typeof r.vibe === "string" ? r.vibe.trim() : "",
    scene: typeof r.scene === "string" ? r.scene.trim() : userPrompt,
    // The user's explicit settings always win over whatever the model chose.
    energy: options ? options.energy : clampEnergy(r.energy),
    emotionalTone: asStringArray(r.emotionalTone, ["atmospheric"]),
    genres: asStringArray(r.genres, ["indie"]),
    searchQueries: searchQueries.slice(0, 10),
    trackCount: options
      ? options.trackCount
      : Math.min(20, Math.max(8, trackCount || 15)),
    transitionLogic:
      typeof r.transitionLogic === "string" && r.transitionLogic.trim()
        ? r.transitionLogic.trim()
        : "A smooth progression from atmospheric openers to a confident, emotional close.",
  };
}

/**
 * Turn a free-text vibe into a structured MoodPlan using OpenAI.
 * Throws OpenAIGenerationError on any failure so the route can fall back.
 */
export async function generateMoodPlan(
  userPrompt: string,
  options?: GenerationOptions
): Promise<MoodPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIGenerationError("OPENAI_API_KEY is not configured");
  }

  const prompt = userPrompt.slice(0, MAX_PROMPT_LENGTH);
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT + optionConstraints(options) },
        {
          role: "user",
          // The user's text is treated strictly as data, never as instructions.
          content: `Create a Mood DJ playlist plan for this vibe:\n\n"""${prompt}"""`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new OpenAIGenerationError("Empty completion");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new OpenAIGenerationError("Invalid JSON from model");
    }
    return validateMoodPlan(parsed, prompt, options);
  } catch (err) {
    if (err instanceof OpenAIGenerationError) throw err;
    throw new OpenAIGenerationError(err instanceof Error ? err.message : "OpenAI request failed");
  }
}

/**
 * Deterministic fallback plan used when OpenAI is unavailable, so the app can
 * still build a (reasonable) playlist from the raw prompt.
 */
export function fallbackMoodPlan(
  userPrompt: string,
  options?: GenerationOptions
): MoodPlan {
  const words = userPrompt.toLowerCase();
  const languageName = options ? LANGUAGE_NAMES[options.language] : undefined;
  const languageSuffix = languageName ? ` ${languageName.toLowerCase()}` : "";
  return {
    playlistName: "Mood DJ Mix",
    playlistDescription: `A playlist inspired by: ${userPrompt}`.slice(0, 280),
    vibe: userPrompt.slice(0, 60),
    scene: userPrompt,
    energy: options ? options.energy : 55,
    emotionalTone: ["atmospheric", "smooth"],
    genres: ["indie", "electronic", "pop"],
    searchQueries: [
      `${words}${languageSuffix} playlist`,
      `${words}${languageSuffix} chill`,
      `${words} mood${languageSuffix}`,
      `indie electronic atmospheric${languageSuffix}`,
      `smooth modern pop${languageSuffix}`,
    ],
    trackCount: options ? options.trackCount : 15,
    transitionLogic:
      "A smooth progression from atmospheric openers to a confident, emotional close.",
  };
}
