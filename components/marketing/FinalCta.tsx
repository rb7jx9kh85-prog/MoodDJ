"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { fadeUp } from "@/lib/animations";
import Magnetic from "@/components/marketing/Magnetic";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function FinalCta() {
  const { t } = useLanguage();
  return (
    <section className="relative px-6 pb-28 pt-4">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeUp}
        className="spotify-glow relative mx-auto max-w-4xl overflow-hidden rounded-4xl border border-spotify/20 bg-gradient-to-br from-[#0a1f10] via-[#050505] to-black px-8 py-16 text-center"
      >
        <div aria-hidden className="aurora absolute inset-0 opacity-50" />
        <div className="relative z-10">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            {t.cta.title} <span className="text-gradient">{t.cta.titleHighlight}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">{t.cta.subtitle}</p>
          <Magnetic strength={14} className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-spotify px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
            >
              {t.cta.button}
              <ArrowRight className="size-4" />
            </Link>
          </Magnetic>
        </div>
      </motion.div>
    </section>
  );
}
