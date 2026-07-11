"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const ratings = [5, 5, 4];

export default function Testimonials() {
  const { t } = useLanguage();

  return (
    <section id="testimonials" className="relative px-6 py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer}
        className="mx-auto max-w-5xl"
      >
        <motion.div variants={fadeUp} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            {t.testimonials.title} <span className="text-gradient">{t.testimonials.titleHighlight}</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {t.testimonials.items.map((item, idx) => (
            <motion.div
              key={item.name}
              variants={fadeUp}
              className="glass-card hover-lift flex flex-col rounded-3xl p-7"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-4 ${
                      i < ratings[idx] ? "fill-spotify-bright text-spotify-bright" : "text-white/15"
                    }`}
                  />
                ))}
              </div>
              <Quote className="mb-2 size-6 text-spotify/30" />
              <p className="flex-1 text-sm leading-relaxed text-soft/90">&ldquo;{item.content}&rdquo;</p>
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-soft">{item.name}</p>
                <p className="text-xs text-muted">{item.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
