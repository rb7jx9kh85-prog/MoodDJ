"use client";

import { motion } from "framer-motion";
import { Wand2, Zap, ShieldCheck, Repeat } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";

const benefits = [
  {
    icon: Wand2,
    title: "Comprend vraiment le vibe",
    description:
      "Décris une scène, une émotion ou une ambiance en langage naturel — l'IA en tire un vrai plan musical, pas juste des mots-clés.",
  },
  {
    icon: Zap,
    title: "Playlist prête en secondes",
    description:
      "Recherche, sélection et création se font en un seul passage. Pas de tri manuel, pas d'allers-retours.",
  },
  {
    icon: ShieldCheck,
    title: "Directement sur ton Spotify",
    description:
      "Aucune copie, aucun lien externe : la playlist est créée sur ton propre compte, prête à écouter dans l'app.",
  },
  {
    icon: Repeat,
    title: "Régénère à volonté",
    description:
      "Pas convaincu par le premier jet ? Relance la génération et affine le mood jusqu'à trouver le bon tempo.",
  },
];

export default function Benefits() {
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
            Pensé pour <span className="text-gradient">l&apos;instant</span>, pas pour la playlist parfaite
          </h2>
          <p className="mt-4 text-muted">
            Mood DJ n&apos;essaie pas de deviner tes goûts pour toujours — il capture ce que tu
            ressens là, maintenant.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {benefits.map((b) => (
            <motion.div
              key={b.title}
              variants={fadeUp}
              className="glass-card hover-lift rounded-3xl p-7"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-spotify/10 text-spotify-bright">
                <b.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-soft">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
