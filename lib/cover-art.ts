import { randomUUID } from "crypto";
import OpenAI from "openai";
import sharp from "sharp";
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

export type GeneratedCover = {
  /** Stable public URL (Firebase Storage) — what Mood DJ itself displays. */
  url: string;
  /** The raw generated PNG, kept around so an immediate Spotify push (same request) can reuse it without re-fetching the URL. */
  pngBuffer: Buffer;
};

/**
 * Generates an AI cover image for a playlist and persists it to Firebase
 * Storage (gpt-image-* models return base64 only — no hosted URL to point
 * to, unlike dall-e-2/3). Returns null on any failure — cover art is a
 * nice-to-have and must never break generation.
 */
export async function generateCoverArt(
  uid: string,
  playlistId: string,
  plan: Pick<MoodPlan, "vibe" | "scene" | "genres" | "emotionalTone" | "energy" | "darkness" | "sensuality">
): Promise<GeneratedCover | null> {
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

    const pngBuffer = Buffer.from(b64, "base64");
    const bucket = getAdminStorage().bucket();
    const filePath = `covers/${uid}/${playlistId}.png`;
    const token = randomUUID();

    await bucket.file(filePath).save(pngBuffer, {
      contentType: "image/png",
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${token}`;
    return { url, pngBuffer };
  } catch (err) {
    console.error("[cover-art] generation failed", {
      uid: uid.slice(0, 6),
      reason: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// Spotify's "Add Custom Playlist Cover Image" endpoint caps the base64-
// encoded body at 256 KB — the raw JPEG must stay comfortably under that
// once base64-inflated (~4/3x), hence the safety margin below.
const SPOTIFY_COVER_MAX_BASE64_BYTES = 256 * 1024;
const SPOTIFY_COVER_MAX_RAW_BYTES = Math.floor((SPOTIFY_COVER_MAX_BASE64_BYTES * 3) / 4) - 4096;

/**
 * Converts a PNG buffer into a JPEG small enough for Spotify's cover-image
 * endpoint, shrinking quality then dimensions until it fits. OpenAI's image
 * models don't expose JPEG compression control, so this is done locally
 * with sharp (already a project dependency, used for the PWA/favicon set).
 */
export async function toSpotifySafeJpegBase64(pngBuffer: Buffer): Promise<string> {
  let size = 1024;
  let quality = 82;

  for (let attempt = 0; attempt < 7; attempt++) {
    const jpeg = await sharp(pngBuffer).resize(size, size).jpeg({ quality }).toBuffer();
    if (jpeg.length <= SPOTIFY_COVER_MAX_RAW_BYTES) {
      return jpeg.toString("base64");
    }
    if (quality > 35) {
      quality -= 12;
    } else {
      size = Math.round(size * 0.75);
    }
  }

  // Last-resort floor — virtually guaranteed to fit for a 1024px source.
  const fallback = await sharp(pngBuffer).resize(400, 400).jpeg({ quality: 30 }).toBuffer();
  return fallback.toString("base64");
}

/** Fetches an already-hosted cover image (e.g. from a prior generation) as a buffer, for a later Spotify push. */
export async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
