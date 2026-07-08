"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import Background from "@/components/Background";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Warm-Up",
    tagline: "Pour découvrir Mood DJ",
    price: "0€",
    period: "toujours",
    highlighted: false,
    cta: "Commencer gratuitement",
    features: [
      "5 playlists générées / mois",
      "Jusqu'à 15 titres par playlist",
      "Connexion Spotify illimitée",
      "Historique sur 7 jours",
    ],
  },
  {
    name: "Headliner",
    tagline: "Pour ceux qui écoutent tous les jours",
    price: "4,99€",
    period: "/ mois",
    highlighted: true,
    cta: "Passer Headliner",
    features: [
      "Playlists illimitées",
      "Jusqu'à 30 titres par playlist",
      "Génération prioritaire",
      "Pochettes personnalisées par IA",
      "Historique illimité",
      "Support par email prioritaire",
    ],
  },
  {
    name: "Backstage Pass",
    tagline: "Pour les power users et les créateurs",
    price: "12,99€",
    period: "/ mois",
    highlighted: false,
    cta: "Passer Backstage",
    features: [
      "Tout Headliner, sans limites",
      "Playlists collaboratives",
      "Statistiques d'écoute avancées",
      "Accès anticipé aux nouvelles fonctionnalités",
      "Support prioritaire 24/7",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="relative">
      <Background />
      <MarketingHeader />

      <main className="relative z-10 px-6 pb-28 pt-40 sm:pt-48">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted"
          >
            <Sparkles className="size-3.5 text-spotify-bright" />
            Sans engagement, résiliable à tout moment
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl font-semibold sm:text-5xl">
            Un tarif pour chaque <span className="text-gradient">rythme d&apos;écoute</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-muted">
            Commence gratuitement. Passe à la vitesse supérieure quand Mood DJ devient ton
            réflexe.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              className={cn(
                "relative flex flex-col rounded-4xl p-8",
                plan.highlighted
                  ? "spotify-glow border-2 border-spotify bg-gradient-to-b from-[#0c2414] to-black"
                  : "glass-card hover-lift"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-spotify px-3 py-1 text-xs font-semibold text-black">
                  Le plus populaire
                </span>
              )}

              <h3 className="text-lg font-semibold text-soft">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-soft">{plan.price}</span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>

              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-soft/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-spotify-bright" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={cn(
                  "mt-8 flex h-12 items-center justify-center rounded-2xl text-sm font-semibold transition-transform hover:scale-[1.02]",
                  plan.highlighted
                    ? "bg-spotify text-black hover:bg-spotify-bright"
                    : "border border-white/15 text-soft hover:border-spotify/40"
                )}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <MarketingFooter />
    </div>
  );
}
