"use client";

import { motion } from "framer-motion";
import { Wand2, Zap, ShieldCheck, Repeat } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const icons = [Wand2, Zap, ShieldCheck, Repeat];

export default function Benefits() {
  const { t } = useLanguage();

  return (
    <section id="benefits" className="relative px-6 py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-5xl"
      >
        <motion.div variants={fadeUp} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            {t.benefits.title} <span className="text-gradient">{t.benefits.titleHighlight}</span>
            {t.benefits.titleSuffix}
          </h2>
          <p className="mt-4 text-muted">{t.benefits.subtitle}</p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {t.benefits.items.map((b, i) => {
            const Icon = icons[i];
            return (
              <motion.div key={b.title} variants={fadeUp} className="glass-card hover-lift rounded-3xl p-7">
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-spotify/10 text-spotify-bright">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-soft">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.description}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
