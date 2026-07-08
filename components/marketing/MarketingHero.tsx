"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SendHorizonal, Sparkles } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";
import ParticleField from "@/components/marketing/ParticleField";
import Magnetic from "@/components/marketing/Magnetic";

export default function MarketingHero() {
  const router = useRouter();
  const [vibe, setVibe] = useState("");

  // Vanilla-feeling scroll parallax: the title drifts up/fades as you scroll
  // past the hero, driven directly by window.scrollY.
  const scrollY = useMotionValue(0);
  const smoothScroll = useSpring(scrollY, { stiffness: 90, damping: 20, mass: 0.3 });
  const titleY = useTransform(smoothScroll, [0, 500], [0, -60]);
  const titleOpacity = useTransform(smoothScroll, [0, 400], [1, 0.35]);

  useEffect(() => {
    const onScroll = () => scrollY.set(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollY]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const target = vibe.trim() ? `/login?vibe=${encodeURIComponent(vibe.trim())}` : "/login";
    router.push(target);
  }

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-40 sm:pt-48">
      <ParticleField />

      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative z-10 mx-auto max-w-3xl text-center"
      >
        <motion.div
          variants={fadeUp}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted"
        >
          <Sparkles className="size-3.5 text-spotify-bright" />
          Propulsé par l&apos;IA + ton compte Spotify
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-balance text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl"
        >
          Décris ton <span className="text-gradient">mood</span>.
          <br />
          Repars avec la playlist.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted"
        >
          Mood DJ transforme une phrase — une ambiance, une scène, une émotion — en une vraie
          playlist Spotify, créée directement sur ton compte en quelques secondes.
        </motion.p>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          id="preview"
          className="pulse-input glass-card mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full p-2 pl-5"
        >
          <input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Ex : soirée d'été sur un rooftop, coucher de soleil…"
            className="h-11 flex-1 bg-transparent text-sm text-soft placeholder:text-muted focus:outline-none"
          />
          <Magnetic strength={10}>
            <button
              type="submit"
              className="spotify-glow flex h-11 shrink-0 items-center gap-2 rounded-full bg-spotify px-5 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
            >
              <span className="hidden sm:block">Générer</span>
              <SendHorizonal className="size-4" />
            </button>
          </Magnetic>
        </motion.form>

        <motion.p variants={fadeUp} className="mt-4 text-xs text-muted">
          Gratuit pour commencer · Aucune carte bancaire requise
        </motion.p>
      </motion.div>
    </section>
  );
}
