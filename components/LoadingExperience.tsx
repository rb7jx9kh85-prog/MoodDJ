"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STEPS = [
  "Reading your vibe…",
  "Finding the right energy…",
  "Mixing transitions…",
  "Creating your Spotify playlist…",
];

/** Immersive loading state: rotating status text, green loader and skeleton tracks. */
export default function LoadingExperience() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass-card rounded-4xl p-6 sm:p-8"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <span
          className="h-12 w-12 rounded-full border-2 border-white/10 border-t-spotify-bright"
          style={{ animation: "subtleSpin 0.9s linear infinite" }}
        />
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-medium text-soft"
        >
          {STEPS[step]}
        </motion.p>
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="shimmer flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
          >
            <div className="h-12 w-12 shrink-0 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-white/5" />
              <div className="h-3 w-1/3 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
