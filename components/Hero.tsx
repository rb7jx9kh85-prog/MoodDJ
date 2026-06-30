"use client";

import { motion } from "framer-motion";
import AnimatedLogo from "./AnimatedLogo";
import { fadeUp, staggerContainer } from "@/lib/animations";

/** Top of the page: logo, AI badge, title and slogan. */
export default function Hero() {
  return (
    <motion.header
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center"
    >
      <motion.div variants={fadeUp}>
        <AnimatedLogo size={84} />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-spotify-bright shadow-[0_0_8px_2px_rgba(30,215,96,0.6)]" />
        AI-powered Spotify playlist generator
      </motion.div>

      <motion.h1
        variants={fadeUp}
        className="mt-6 text-6xl font-bold tracking-tight sm:text-7xl md:text-8xl"
      >
        <span className="text-gradient">Mood DJ</span>
      </motion.h1>

      <motion.p
        variants={fadeUp}
        className="mt-4 max-w-xl text-balance text-lg text-muted sm:text-xl"
      >
        Describe a vibe. Get the perfect playlist.
      </motion.p>
    </motion.header>
  );
}
