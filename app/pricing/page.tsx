"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X, Sparkles, Loader2 } from "lucide-react";

import Background from "@/components/Background";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

import { type SelectablePlan } from "@/lib/plans";

import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const planMeta: Array<{
  id: SelectablePlan;
  price: string;
  highlighted: boolean;
  badge?: string;
}> = [
  {
    id: "free",
    price: "0 CHF",
    highlighted: false,
  },
  {
    id: "starter",
    price: "4,90 CHF",
    highlighted: false,
  },
  {
    id: "creator",
    price: "7,90 CHF",
    highlighted: true,
    badge: "⭐",
  },
  {
    id: "unlimited",
    price: "15 CHF",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checked } = useFirebaseUser();

  const initialPrompt = searchParams.get("vibe") ?? "";

  const plans = t.pricing.plans.map((plan, index) => ({
    ...plan,
    ...planMeta[index],
  }));

  // Firebase auth state hasn't resolved yet — don't let anyone pick a plan
  // (and possibly bounce to /login) based on a stale "not connected" guess.
  if (!checked) {
    return <PricingLoading />;
  }

  function handleSelectPlan(planId: SelectablePlan) {
    if (!user) {
      const loginTarget = initialPrompt
        ? `/login?vibe=${encodeURIComponent(initialPrompt)}`
        : "/login";

      router.replace(loginTarget);
      return;
    }

    const params = new URLSearchParams({ plan: planId });
    if (initialPrompt) params.set("vibe", initialPrompt);

    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background />

      <div className="relative z-10">
        <MarketingHeader />

        <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:px-8 lg:px-10">
          <motion.section
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div
              variants={fadeUp}
              className="mx-auto inline-flex items-center gap-2 rounded-full border border-spotify/20 bg-spotify/10 px-4 py-2 text-sm font-medium text-spotify"
            >
              <Sparkles className="size-4" />
              <span>{t.pricing.badge}</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight text-soft sm:text-5xl lg:text-6xl"
            >
              {t.pricing.title}{" "}
              <span className="text-spotify">{t.pricing.titleHighlight}</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg"
            >
              {t.pricing.subtitle}
            </motion.p>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            {plans.map((plan) => (
              <motion.article
                key={plan.id}
                variants={fadeUp}
                className={cn(
                  "relative flex h-full flex-col rounded-4xl border p-7 backdrop-blur-xl",
                  plan.highlighted
                    ? "border-spotify/50 bg-spotify/10 shadow-[0_0_60px_rgba(29,185,84,0.12)]"
                    : "border-white/10 bg-white/5"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-spotify px-4 py-1.5 text-xs font-bold text-black shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-semibold text-soft">{plan.name}</h2>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{plan.tagline}</p>
                </div>

                <div className="mt-7">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold tracking-tight text-soft">{plan.price}</span>

                    <span className="pb-1 text-sm text-muted">{plan.period}</span>
                  </div>
                </div>

                <ul className="mt-8 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-spotify/15 text-spotify">
                          <Check className="size-3.5" />
                        </span>
                      ) : (
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted">
                          <X className="size-3.5" />
                        </span>
                      )}

                      <span className={feature.included ? "text-soft" : "text-muted"}>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(
                    "mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.02]",
                    plan.highlighted
                      ? "bg-spotify text-black hover:bg-spotify-bright"
                      : "border border-white/15 bg-white/5 text-soft hover:border-spotify/40 hover:bg-white/10"
                  )}
                >
                  {plan.cta}
                </button>
              </motion.article>
            ))}
          </motion.section>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}

function PricingLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <Loader2 className="mx-auto size-9 animate-spin text-spotify" />

        <p className="mt-4 text-sm text-white/60">Chargement des offres…</p>
      </div>
    </main>
  );
}
