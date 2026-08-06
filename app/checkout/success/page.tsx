"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import Background from "@/components/Background";
import { getCurrentUserPlan } from "@/lib/plan-onboarding";
import { useFirebaseUser } from "@/lib/useFirebaseUser";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessLoading />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

/**
 * Whop redirects here right after the customer completes payment on Whop's
 * side — but that redirect is not itself proof of payment. The plan only
 * actually flips to "active" once the Whop webhook lands
 * (app/api/webhooks/whop/route.ts), so this page polls Firestore for that to
 * happen before sending the user into the app.
 */
function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checked } = useFirebaseUser();
  const plan = searchParams.get("plan");

  const [status, setStatus] = useState<"waiting" | "confirmed" | "timeout">("waiting");

  useEffect(() => {
    if (!checked) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      const profile = await getCurrentUserPlan();

      if (cancelled) return;

      if (profile?.onboardingCompleted && profile.selectedPlan === plan) {
        setStatus("confirmed");
        window.setTimeout(() => {
          if (!cancelled) router.replace("/app");
        }, 900);
        return;
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setStatus("timeout");
        return;
      }

      window.setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [checked, user, plan, router]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Background />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        {status === "confirmed" ? (
          <>
            <CheckCircle2 className="size-14 text-spotify-bright" />
            <h1 className="mt-5 text-2xl font-semibold text-soft">Paiement confirmé !</h1>
            <p className="mt-2 text-sm text-muted">Direction l&apos;app…</p>
          </>
        ) : status === "timeout" ? (
          <>
            <AlertTriangle className="size-14 text-amber-300" />
            <h1 className="mt-5 text-2xl font-semibold text-soft">Ça prend plus de temps que prévu</h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Ton paiement Whop est peut-être encore en cours de traitement. Réessaie de rafraîchir
              dans quelques instants — si le problème persiste, contacte le support.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="size-10 animate-spin text-spotify" />
            <h1 className="mt-5 text-2xl font-semibold text-soft">Confirmation du paiement…</h1>
            <p className="mt-2 text-sm text-muted">Merci de patienter, ça ne prend que quelques secondes.</p>
          </>
        )}
      </div>
    </div>
  );
}

function CheckoutSuccessLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black text-white">
      <Loader2 className="size-9 animate-spin text-spotify" />
    </main>
  );
}
