"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, BadgeCheck } from "lucide-react";

import Background from "@/components/Background";
import LogoMark from "@/components/LogoMark";
import LanguageSelector from "@/components/LanguageSelector";

import { isSelectablePlan, PLAN_CATALOG, formatChf, type SelectablePlan } from "@/lib/plans";
import { createCheckout } from "@/lib/plan-onboarding";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { fadeUp, staggerContainer } from "@/lib/animations";

// Same order as app/pricing/page.tsx's planMeta, so index-matching against
// t.pricing.plans gives the right name/tagline for a given plan id.
const PLAN_ORDER: SelectablePlan[] = ["free", "starter", "creator", "unlimited"];

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checked } = useFirebaseUser();

  const planParam = searchParams.get("plan");
  const vibe = searchParams.get("vibe") ?? "";

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!checked) return;

    if (!user) {
      const loginTarget = vibe ? `/login?vibe=${encodeURIComponent(vibe)}` : "/login";
      router.replace(loginTarget);
      return;
    }

    if (!isSelectablePlan(planParam)) {
      router.replace("/pricing");
      return;
    }

    setReady(true);
  }, [checked, user, planParam, vibe, router]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const plan = (ready && isSelectablePlan(planParam) ? planParam : "free") as SelectablePlan;
  const catalogEntry = PLAN_CATALOG[plan];
  const planIndex = PLAN_ORDER.indexOf(plan);
  const planCopy = t.pricing.plans[planIndex];
  const isFree = plan === "free";

  async function handleContinue() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createCheckout(plan);

      if (result.kind === "redirect") {
        window.location.href = result.checkoutUrl;
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        const target = vibe ? `/app?vibe=${encodeURIComponent(vibe)}` : "/app";
        router.replace(target);
      }, 1100);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue. Réessaie.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <CheckoutLoading />;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Background />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={vibe ? `/pricing?vibe=${encodeURIComponent(vibe)}` : "/pricing"}
            className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-soft"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-sm font-semibold tracking-tight text-soft">Mood DJ</span>
          </Link>

          <LanguageSelector />
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card flex flex-col items-center rounded-4xl p-10 text-center"
            >
              <CheckCircle2 className="size-14 text-spotify-bright" />
              <h1 className="mt-5 text-2xl font-semibold text-soft">Ton plan est activé !</h1>
              <p className="mt-2 text-sm text-muted">
                {planCopy.name} est maintenant actif sur ton compte. Direction l&apos;app…
              </p>
              <Loader2 className="mt-6 size-5 animate-spin text-muted" />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-5"
            >
              {/* Order summary */}
              <motion.section variants={fadeUp} className="glass-card rounded-4xl p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Plan sélectionné</p>
                    <h1 className="mt-1 text-2xl font-bold text-soft">{planCopy.name}</h1>
                    <p className="mt-1 text-sm text-muted">{planCopy.tagline}</p>
                  </div>
                  <BadgeCheck className="size-6 shrink-0 text-spotify-bright" />
                </div>

                <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-soft first:border-t-0 first:pt-0">
                    <span>Total</span>
                    <span>{formatChf(catalogEntry.priceCents)}</span>
                  </div>
                </div>
              </motion.section>

              {!isFree && (
                <motion.p
                  variants={fadeUp}
                  className="flex items-center gap-1.5 px-1 text-xs text-muted"
                >
                  <ShieldCheck className="size-3.5" />
                  Paiement sécurisé traité par Whop. Tu vas être redirigé·e vers la page de
                  paiement Whop pour finaliser ta commande.
                </motion.p>
              )}

              {submitError && (
                <motion.p
                  variants={fadeUp}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300"
                >
                  {submitError}
                </motion.p>
              )}

              <motion.button
                variants={fadeUp}
                type="button"
                onClick={handleContinue}
                disabled={submitting}
                className="spotify-glow flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-spotify py-4 text-base font-semibold text-black transition-colors hover:bg-spotify-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting
                  ? "Redirection…"
                  : isFree
                  ? "Activer gratuitement"
                  : "Continuer vers le paiement"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black text-white">
      <div className="text-center">
        <Loader2 className="mx-auto size-9 animate-spin text-spotify" />
        <p className="mt-4 text-sm text-white/60">Préparation du checkout…</p>
      </div>
    </main>
  );
}
