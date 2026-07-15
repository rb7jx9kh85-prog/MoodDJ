"use client";

import { motion } from "framer-motion";

export default function TierProgressBar({
  currentValue,
  targetValue,
  label,
}: {
  currentValue: number;
  targetValue: number;
  /** e.g. "Next tier: Ambassador" — already fully composed by the caller. */
  label: string;
}) {
  const pct = Math.min(100, Math.round((currentValue / Math.max(targetValue, 1)) * 100));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {Math.min(currentValue, targetValue)} / {targetValue}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-spotify to-spotify-bright"
        />
      </div>
    </div>
  );
}
