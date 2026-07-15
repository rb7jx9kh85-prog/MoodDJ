import { randomUUID } from "crypto";
import OpenAI from "openai";
import { getAdminStorage } from "@/lib/firebase-admin";
import type { MoodPlan } from "@/types";

// Latest flagship image model (gpt-image-1 is deprecating 2026-10-23 — see
// lib/openai.ts's model note for the same reasoning on the text side).
const COVER_MODEL = "gpt-image-2";

function buildCoverPrompt(plan: Pick<MoodPlan, "vibe" | "scene" | "genres" | "emotionalTone" | "energy" | "darkness" | "sensuality">): string {
  const descriptors = [...plan.emotionalTone, ...plan.genres].filter(Boolean).slice(0, 6).join(", ");
  const energyWord = plan.energy >= 70 ? "high-energy, intense" : plan.energy <= 30 ? "calm, low-key" : "mid-tempo";
  const darkWord = plan.darkness >= 60 ? "dark, moody" : plan.darkness <= 25 ? "bright, luminous" : "";
  const sensualWord = plan.sensuality >= 60 ? "sensual, intimate" : "";

  return [
    "Abstract album cover art for a music playlist.",
    `Mood: ${plan.vibe || plan.scene}.`,
    descriptors && `Style cues: ${descriptors}.`,
    `Atmosphere: ${[energyWord, darkWord, sensualWord].filter(Boolean).join(", ")}.`,
    "Square composition, rich color grading, cinematic lighting, high production value.",
    "No text, no words, no letters, no typography, no logos, no watermarks.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Generates an AI cover image for a playlist and persists it to Firebase
 * Storage (gpt-image-* models return base64 only — no hosted URL to point
 * to, unlike dall-e-2/3). Returns a stable public download URL, or null on
 * any failure — cover art is a nice-to-have and must never break generation.
 */
export async function generateCoverArt(
  uid: string,
  playlistId: string,
  plan: Pick<MoodPlan, "vibe" | "scene" | "genres" | "emotionalTone" | "energy" | "darkness" | "sensuality">
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });
    const result = await client.images.generate({
      model: COVER_MODEL,
      prompt: buildCoverPrompt(plan),
      size: "1024x1024",
      quality: "low",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;

    const buffer = Buffer.from(b64, "base64");
    const bucket = getAdminStorage().bucket();
    const filePath = `covers/${uid}/${playlistId}.png`;
    const token = randomUUID();

    await bucket.file(filePath).save(buffer, {
      contentType: "image/png",
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${token}`;
  } catch (err) {
    console.error("[cover-art] generation failed", {
      uid: uid.slice(0, 6),
      reason: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
