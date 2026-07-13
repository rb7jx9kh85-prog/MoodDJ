"use client";

import { motion } from "framer-motion";
import { Play, Music2 } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import TiltCard from "@/components/marketing/TiltCard";
import EqualizerBars from "@/components/marketing/EqualizerBars";

const mockTracks = [
  { title: "Golden Hour", artist: "Kacey Musgraves", duration: "3:28" },
  { title: "Redbone", artist: "Childish Gambino", duration: "5:27" },
  { title: "Sunflower, Vol. 6", artist: "Harry Styles", duration: "4:31" },
  { title: "Feels Like Summer", artist: "Childish Gambino", duration: "4:15" },
];

export default function PreviewShowcase() {
  const { t } = useLanguage();

  return (
    <section id="preview" className="relative px-6 py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2"
      >
        <motion.div variants={fadeUp}>
          <span className="text-xs font-semibold uppercase tracking-widest text-spotify-bright">
            {t.preview.eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {t.preview.title} <span className="text-gradient">{t.preview.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-muted">{t.preview.description}</p>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            {t.preview.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-spotify-bright" />
                {b}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={fadeUp}>
          <TiltCard className="glass-card rounded-4xl p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-spotify to-spotify-bright text-black">
              <Music2 className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-soft">{t.preview.playlistTitle}</p>
              <p className="text-xs text-muted">{t.preview.playlistMeta}</p>
            </div>
            <EqualizerBars bars={5} className="h-6 w-8" barClassName="w-[3px]" />
          </div>

          <div className="mt-4 space-y-1">
            {mockTracks.map((track, i) => (
              <div
                key={track.title}
                className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs text-muted">{i + 1}</span>
                  <div>
                    <p className="font-medium text-soft">{track.title}</p>
                    <p className="text-xs text-muted">{track.artist}</p>
                  </div>
                </div>
                <span className="text-xs text-muted">{track.duration}</span>
              </div>
            ))}
          </div>

          <button className="spotify-glow mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-spotify py-3 text-sm font-semibold text-black">
            <Play className="size-4 fill-black" />
            {t.preview.ctaListen}
          </button>
          </TiltCard>
        </motion.div>
      </motion.div>
    </section>
  );
}
