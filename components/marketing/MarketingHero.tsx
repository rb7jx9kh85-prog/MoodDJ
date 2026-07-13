"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion";
import { SendHorizonal, Sparkles } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";
import ParticleField from "@/components/marketing/ParticleField";
import Magnetic from "@/components/marketing/Magnetic";
import EqualizerBars from "@/components/marketing/EqualizerBars";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const wordVariant: Variants = {
  hidden: { opacity: 0, y: 28, rotateX: 55, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: { type: "spring", bounce: 0.35, duration: 0.9 },
  },
};

function StaggerWords({ text, gradient = false }: { text: string; gradient?: boolean }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordVariant}
          className={`inline-block will-change-transform ${gradient ? "text-gradient" : ""}`}
        >
          {word}
          {" "}
        </motion.span>
      ))}
    </>
  );
}

const NOTES = [
  { symbol: "♪", left: "8%", top: "70%", delay: "0s", size: "1.4rem" },
  { symbol: "♫", left: "16%", top: "48%", delay: "2.2s", size: "1.1rem" },
  { symbol: "♬", left: "84%", top: "62%", delay: "1.1s", size: "1.5rem" },
  { symbol: "♪", left: "91%", top: "42%", delay: "3.4s", size: "1rem" },
  { symbol: "♩", left: "74%", top: "78%", delay: "4.6s", size: "1.2rem" },
];

export default function MarketingHero() {
  const { t } = useLanguage();
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

      {/* Giant translucent equalizer glowing behind the headline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-24 flex h-72 items-end justify-center opacity-[0.16] sm:top-28"
        style={{
          maskImage: "radial-gradient(ellipse 60% 90% at 50% 100%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 90% at 50% 100%, #000 30%, transparent 75%)",
        }}
      >
        <EqualizerBars bars={48} className="h-full w-full max-w-3xl" barClassName="w-2" />
      </div>

      {/* Drifting music notes */}
      {NOTES.map((n, i) => (
        <span
          key={i}
          aria-hidden
          className="floating-note text-spotify-bright/60"
          style={{ left: n.left, top: n.top, animationDelay: n.delay, fontSize: n.size }}
        >
          {n.symbol}
        </span>
      ))}

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
          {t.hero.badge}
        </motion.div>

        <motion.h1
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
          className="text-balance text-4xl font-semibold leading-tight [perspective:900px] sm:text-5xl md:text-6xl"
        >
          <StaggerWords text={t.hero.titleLine1} />
          <StaggerWords text={t.hero.titleHighlight + "."} gradient />
          <br />
          <StaggerWords text={t.hero.titleLine2} />
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted"
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          className="pulse-input glass-card mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full p-2 pl-5"
        >
          <input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder={t.hero.placeholder}
            className="h-11 flex-1 bg-transparent text-sm text-soft placeholder:text-muted focus:outline-none"
          />
          <Magnetic strength={10}>
            <button
              type="submit"
              className="spotify-glow flex h-11 shrink-0 items-center gap-2 rounded-full bg-spotify px-5 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
            >
              <span className="hidden sm:block">{t.hero.generate}</span>
              <SendHorizonal className="size-4" />
            </button>
          </Magnetic>
        </motion.form>

        <motion.p variants={fadeUp} className="mt-4 text-xs text-muted">
          {t.hero.freeNote}
        </motion.p>
      </motion.div>
    </section>
  );
}
