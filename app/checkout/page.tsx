"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FlaskConical,
  Tag,
  User,
  CreditCard,
  Calendar,
  Lock,
  Wand2,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";

import Background from "@/components/Background";
import LogoMark from "@/components/LogoMark";
import LanguageSelector from "@/components/LanguageSelector";

import { isSelectablePlan, PLAN_CATALOG, formatChf, type SelectablePlan } from "@/lib/plans";
import { resolveDiscountCode, type DiscountResolution } from "@/lib/discount-codes";
import { completeFakeCheckout } from "@/lib/plan-onboarding";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

// Same order as app/pricing/page.tsx's planMeta, so index-matching against
// t.pricing.plans gives the right name/tagline for a given plan id.
const PLAN_ORDER: SelectablePlan[] = ["free", "starter", "creator", "unlimited"];

const TEST_CARD = {
  name: "NOE TEST",
  number: "4242 4242 4242 4242",
  expiry: "12/30",
  cvc: "123",
};

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

type FieldErrors = Partial<Record<"cardName" | "cardNumber" | "cardExpiry" | "cardCvc", string>>;

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

  // --- Promo code ---
  const [promoInput, setPromoInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountResolution | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // --- Fake card fields (never sent anywhere) ---
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const plan = (ready && isSelectablePlan(planParam) ? planParam : "free") as SelectablePlan;
  const catalogEntry = PLAN_CATALOG[plan];
  const planIndex = PLAN_ORDER.indexOf(plan);
  const planCopy = t.pricing.plans[planIndex];

  const originalPriceCents = catalogEntry.priceCents;
  const discountPercent = appliedDiscount?.valid ? appliedDiscount.percent : 0;
  const discountAmountCents = useMemo(
    () => Math.round((originalPriceCents * discountPercent) / 100),
    [originalPriceCents, discountPercent]
  );
  const finalPriceCents = Math.max(0, originalPriceCents - discountAmountCents);
  const isFree = finalPriceCents === 0;

  function handleApplyPromo() {
    setPromoError(null);
    const resolution = resolveDiscountCode(promoInput, plan);
    if (!resolution.valid) {
      setAppliedDiscount(null);
      setPromoError("Code promo invalide pour ce plan.");
      return;
    }
    setAppliedDiscount(resolution);
  }

  function fillTestCard() {
    setCardName(TEST_CARD.name);
    setCardNumber(TEST_CARD.number);
    setCardExpiry(TEST_CARD.expiry);
    setCardCvc(TEST_CARD.cvc);
    setFieldErrors({});
  }

  function validateCard(): boolean {
    const errors: FieldErrors = {};

    if (!cardName.trim()) errors.cardName = "Nom requis.";

    const digits = cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(digits)) errors.cardNumber = "Numéro à 16 chiffres requis.";

    const expiryMatch = cardExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch) {
      errors.cardExpiry = "Format MM/AA.";
    } else {
      const month = Number(expiryMatch[1]);
      if (month < 1 || month > 12) errors.cardExpiry = "Mois invalide.";
    }

    if (!/^\d{3,4}$/.test(cardCvc)) errors.cardCvc = "CVC invalide.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (!isFree && !validateCard()) return;

    setSubmitting(true);
    try {
      await completeFakeCheckout(plan, appliedDiscount?.valid ? appliedDiscount.code : null);
      setSuccess(true);
      window.setTimeout(() => {
        const target = vibe ? `/app?vibe=${encodeURIComponent(vibe)}` : "/app";
        router.replace(target);
      }, 1100);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue. Réessaie.");
    } finally {
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

        {/* Fictitious checkout badge */}
        <div className="mx-auto mb-6 flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-300">
          <FlaskConical className="size-3.5" />
          Terminal fictif — aucun vrai paiement n&apos;est effectué
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
                  <div className="flex items-center justify-between text-muted">
                    <span>Prix {planCopy.name}</span>
                    <span className={cn(discountAmountCents > 0 && "line-through")}>
                      {formatChf(originalPriceCents)}
                    </span>
                  </div>

                  {discountAmountCents > 0 && (
                    <div className="flex items-center justify-between text-spotify-bright">
                      <span>Réduction ({appliedDiscount?.code} · -{discountPercent}%)</span>
                      <span>-{formatChf(discountAmountCents)}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-soft">
                    <span>Total</span>
                    <span>{formatChf(finalPriceCents)}</span>
                  </div>
                </div>
              </motion.section>

              {/* Promo code */}
              <motion.section variants={fadeUp} className="glass-card rounded-4xl p-6 sm:p-7">
                <label className="flex items-center gap-2 text-sm font-medium text-soft">
                  <Tag className="size-4 text-spotify-bright" />
                  Code de réduction
                </label>

                <div className="mt-3 flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      setPromoError(null);
                    }}
                    placeholder="Ex : 123456"
                    className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim()}
                    className="hover-lift rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Appliquer
                  </button>
                </div>

                {promoError && <p className="mt-2 text-xs text-red-300">{promoError}</p>}
                {appliedDiscount?.valid && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-spotify-bright">
                    <CheckCircle2 className="size-3.5" />
                    Code {appliedDiscount.code} appliqué : -{appliedDiscount.percent}%
                  </p>
                )}
              </motion.section>

              {/* Fake card form */}
              {!isFree && (
                <motion.section variants={fadeUp} className="glass-card rounded-4xl p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-soft">
                      <CreditCard className="size-4 text-spotify-bright" />
                      Paiement (fictif)
                    </label>
                    <button
                      type="button"
                      onClick={fillTestCard}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-soft"
                    >
                      <Wand2 className="size-3.5" />
                      Carte de test
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Nom sur la carte"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                      />
                      {fieldErrors.cardName && (
                        <p className="mt-1 text-xs text-red-300">{fieldErrors.cardName}</p>
                      )}
                    </div>

                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <input
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4242 4242 4242 4242"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                      />
                      {fieldErrors.cardNumber && (
                        <p className="mt-1 text-xs text-red-300">{fieldErrors.cardNumber}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Calendar className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                        <input
                          inputMode="numeric"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/AA"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                        />
                        {fieldErrors.cardExpiry && (
                          <p className="mt-1 text-xs text-red-300">{fieldErrors.cardExpiry}</p>
                        )}
                      </div>

                      <div className="relative flex-1">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                        <input
                          inputMode="numeric"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="CVC"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                        />
                        {fieldErrors.cardCvc && (
                          <p className="mt-1 text-xs text-red-300">{fieldErrors.cardCvc}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <ShieldCheck className="size-3.5" />
                    Ces champs sont 100% fictifs — rien n&apos;est envoyé ni stocké.
                  </p>
                </motion.section>
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
                onClick={handleSubmit}
                disabled={submitting}
                className="spotify-glow flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-spotify py-4 text-base font-semibold text-black transition-colors hover:bg-spotify-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Activation…" : isFree ? "Activer gratuitement" : "Simuler le paiement"}
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
