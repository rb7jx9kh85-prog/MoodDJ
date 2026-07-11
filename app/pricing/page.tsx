"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import Background from "@/components/Background";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Feature = { text: string; included: boolean };

const plans: {
  name: string;
  tagline: string;
  price: string;
  period: string;
  highlighted: boolean;
  badge?: string;
  cta: string;
  features: Feature[];
}[] = [
  {
    name: "Free",
    tagline: "Pour découvrir Mood DJ",
    price: "0 CHF",
    period: "toujours",
    highlighted: false,
    cta: "Commencer gratuitement",
    features: [
      { text: "1 playlist générée gratuitement", included: true },
      { text: "Génération par IA avec vraies recherches Spotify", included: true },
      { text: "Aucune carte bancaire requise", included: true },
      { text: "Publication sur Spotify", included: false },
    ],
  },
  {
    name: "Flow",
    tagline: "Tout ce qu'il faut pour générer la playlist parfaite.",
    price: "4,90 CHF",
    period: "/ mois",
    highlighted: false,
    cta: "Choisir Flow",
    features: [
      { text: "Génération de playlists IA illimitée", included: true },
      { text: "Crée une playlist à partir de n'importe quel mood ou prompt", included: true },
      { text: "Recommandations de titres intelligentes", included: true },
      { text: "Génération rapide", included: true },
      { text: "Historique de tes playlists sauvegardé", included: true },
      { text: "Accès à toutes les langues supportées", included: true },
      { text: "Synchronisation Spotify en un clic", included: false },
    ],
  },
  {
    name: "Flow Sync",
    tagline: "Tout Flow, plus l'intégration Spotify instantanée.",
    price: "7,90 CHF",
    period: "/ mois",
    highlighted: true,
    badge: "⭐ Le plus populaire",
    cta: "Choisir Flow Sync",
    features: [
      { text: "Tout ce qui est inclus dans Flow", included: true },
      { text: "Synchronisation Spotify en un clic", included: true },
      { text: "Création automatique de la playlist sur ton compte Spotify", included: true },
      { text: "Mise à jour des playlists existantes", included: true },
      { text: "Exports Spotify illimités", included: true },
      { text: "Génération prioritaire", included: true },
      { text: "Accès anticipé aux nouvelles fonctionnalités", included: true },
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
            Génère, ou génère <span className="text-gradient">et publie</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-muted">
            Mood DJ génère toujours ta playlist. Passer sur Spotify, c&apos;est à toi de choisir.
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
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-spotify px-3 py-1 text-xs font-semibold text-black">
                  {plan.badge}
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
                  <li
                    key={f.text}
                    className={cn(
                      "flex items-start gap-2.5",
                      f.included ? "text-soft/90" : "text-muted/60 line-through decoration-muted/40"
                    )}
                  >
                    {f.included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-spotify-bright" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-muted/50" />
                    )}
                    {f.text}
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
