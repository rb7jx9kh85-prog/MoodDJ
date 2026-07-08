"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { fadeUp } from "@/lib/animations";
import Magnetic from "@/components/marketing/Magnetic";

export default function FinalCta() {
  return (
    <section className="relative px-6 pb-28 pt-4">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeUp}
        className="spotify-glow relative mx-auto max-w-4xl overflow-hidden rounded-4xl border border-spotify/20 bg-gradient-to-br from-[#0a1f10] via-[#050505] to-black px-8 py-16 text-center"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(30,215,96,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(29,185,84,0.18), transparent 45%)",
          }}
        />
        <div className="relative z-10">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Ta prochaine playlist est à <span className="text-gradient">une phrase</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Connecte ton compte, décris ton mood, et laisse Mood DJ s&apos;occuper du reste.
          </p>
          <Magnetic strength={14} className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-spotify px-7 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
            >
              Commencer gratuitement
              <ArrowRight className="size-4" />
            </Link>
          </Magnetic>
        </div>
      </motion.div>
    </section>
  );
}
