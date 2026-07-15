"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const STEPS = [
  "Reading your vibe…",
  "Finding the right energy…",
  "Mixing transitions…",
  "Creating your Spotify playlist…",
];

const EQ_BARS = [0.55, 1, 0.7, 0.9, 0.5];

/**
 * Immersive loading state: an animated equalizer in the brand gradient, a
 * progress rail that advances with each status step, and skeleton tracks
 * that cascade in.
 */
export default function LoadingExperience() {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass-card rounded-4xl p-6 sm:p-8"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Equalizer loader in the logo's gradient */}
        <div className="flex h-12 items-end gap-1.5" aria-hidden>
          {EQ_BARS.map((peak, i) => (
            <motion.span
              key={i}
              className="w-2 rounded-full bg-gradient-to-t from-spotify to-spotify-bright"
              animate={
                reduceMotion
                  ? { height: 24 }
                  : { height: [10, 44 * peak, 16, 40 * peak, 10] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 1.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.12,
                    }
              }
            />
          ))}
        </div>

        <div className="h-7">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg font-medium text-soft"
            >
              {STEPS[step]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress rail advancing with each step */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-spotify to-spotify-bright"
            initial={{ width: "8%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="shimmer flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
          >
            <div className="h-12 w-12 shrink-0 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-white/5" />
              <div className="h-3 w-1/3 rounded bg-white/5" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
