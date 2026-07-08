"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";

const testimonials = [
  {
    name: "Léa Fontaine",
    role: "Organise des soirées entre amis",
    content:
      "J'ai tapé « apéro d'été, terrasse, ambiance qui monte doucement » et la playlist était littéralement parfaite. Plus besoin de passer 40 minutes à chercher des morceaux avant que les gens arrivent.",
    rating: 5,
  },
  {
    name: "Malik Benali",
    role: "Coach sportif indépendant",
    content:
      "Je génère une playlist différente à chaque séance selon l'intensité du cours. Mes clients me demandent régulièrement le nom de l'app.",
    rating: 5,
  },
  {
    name: "Chloé Rey",
    role: "Étudiante en architecture",
    content:
      "Pour bosser en focus profond, décrire l'ambiance que je veux marche bien mieux que chercher une playlist toute faite sur Spotify. Le seul bémol : parfois trop de titres déjà connus, j'aimerais plus de découvertes.",
    rating: 4,
  },
];

export default function Testimonials() {
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
            Ils ont laissé <span className="text-gradient">l&apos;IA choisir</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="glass-card hover-lift flex flex-col rounded-3xl p-7"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-4 ${
                      i < t.rating ? "fill-spotify-bright text-spotify-bright" : "text-white/15"
                    }`}
                  />
                ))}
              </div>
              <Quote className="mb-2 size-6 text-spotify/30" />
              <p className="flex-1 text-sm leading-relaxed text-soft/90">&ldquo;{t.content}&rdquo;</p>
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-sm font-semibold text-soft">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
