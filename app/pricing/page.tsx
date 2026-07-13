"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  completePlanOnboarding,
  type SelectablePlan,
} from "@/lib/plan-onboarding";

import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import Background from "@/components/Background";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// Prices and layout flags are locale-independent — only copy comes from the dictionary.
const planMeta = [
  { price: "0 CHF", highlighted: false, badge: undefined as string | undefined },
  { price: "4,90 CHF", highlighted: false, badge: undefined as string | undefined },
  { price: "7,90 CHF", highlighted: true, badge: "⭐" },
  { price: "15 CHF", highlighted: false, badge: "🔓" },
];

export default function PricingPage() {
  const { t } = useLanguage();
  const plans = t.pricing.plans.map((p, i) => ({ ...p, ...planMeta[i] }));

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
            {t.pricing.badge}
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl font-semibold sm:text-5xl">
            {t.pricing.title} <span className="text-gradient">{t.pricing.titleHighlight}</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-muted">
            {t.pricing.subtitle}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
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
