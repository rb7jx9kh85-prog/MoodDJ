"use client";

import { Music2 } from "lucide-react";

// Prompt examples stay in English on purpose — they're AI prompts, not UI copy
// (same rationale as the example chips in MoodInput).
const MOODS = [
  "Late-night drive in the rain",
  "Sunset rooftop apéro",
  "Deep focus at 2 AM",
  "Tokyo hotel lobby",
  "Post-breakup elegance",
  "Pre-race adrenaline",
  "Neon city walk",
  "Sunday morning pancakes",
  "Desert road trip",
  "Cozy fireplace jazz",
  "Gym beast mode",
  "Ocean cliff meditation",
];

/** Infinite horizontal marquee of mood prompts — the track is duplicated once
 * and translated -50% in a loop, so the scroll is seamless. */
export default function MoodMarquee() {
  const doubled = [...MOODS, ...MOODS];

  return (
    <section aria-hidden className="relative overflow-hidden border-y border-white/5 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black to-transparent" />

      <div className="marquee-track flex w-max items-center gap-4">
        {doubled.map((mood, i) => (
          <span
            key={`${mood}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-muted"
          >
            <Music2 className="size-3.5 text-spotify-bright" />
            {mood}
          </span>
        ))}
      </div>
    </section>
  );
}
