"use client";

import { motion } from "framer-motion";
import LogoMark from "./LogoMark";
import { cn } from "@/lib/utils";

type AnimatedLogoProps = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
};

/** The clean Mood DJ mark with a soft breathing glow + optional wordmark. */
export default function AnimatedLogo({
  size = 64,
  className,
  withWordmark = false,
}: AnimatedLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.div
        className="relative grid place-items-center"
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Soft glow behind the mark */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-spotify/30 blur-2xl"
          animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <LogoMark size={size} className="relative drop-shadow-[0_0_18px_rgba(29,185,84,0.35)]" />
      </motion.div>

      {withWordmark && (
        <span className="text-xl font-semibold tracking-tight">
          <span className="text-white">Mood</span>{" "}
          <span className="text-spotify-bright">DJ</span>
        </span>
      )}
    </div>
  );
}
