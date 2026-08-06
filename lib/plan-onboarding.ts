import { doc, getDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { CheckoutCreateResponse } from "@/app/api/checkout/create/route";
import type { SelectablePlan } from "@/lib/plans";

export type { SelectablePlan };

export interface UserPlanProfile {
  plan: string;
  selectedPlan: SelectablePlan | null;
  onboardingCompleted: boolean;
}

export async function getCurrentUserPlan(): Promise<UserPlanProfile | null> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    return null;
  }

  const userRef = doc(getFirebaseDb(), "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  const selectedPlan: SelectablePlan | null =
    data.selectedPlan === "free" ||
    data.selectedPlan === "starter" ||
    data.selectedPlan === "creator" ||
    data.selectedPlan === "unlimited"
      ? data.selectedPlan
      : null;

  return {
    plan: typeof data.plan === "string" ? data.plan : "free",
    selectedPlan,
    onboardingCompleted: data.onboardingCompleted === true,
  };
}

/**
 * Starts a real checkout: the browser never writes plan/selectedPlan/price
 * fields to Firestore itself (firestore.rules forbids it). The server
 * activates the free plan directly, or creates a Whop checkout session and
 * returns its URL for paid plans — the plan only actually turns "active" once
 * the Whop webhook confirms payment (see app/api/webhooks/whop/route.ts).
 */
export async function createCheckout(
  selectedPlan: SelectablePlan
): Promise<CheckoutCreateResponse> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Tu dois être connecté pour finaliser ta commande.");
  }

  const idToken = await user.getIdToken();

  const res = await fetch("/api/checkout/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ plan: selectedPlan }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    switch (data.error) {
      case "not_authenticated":
        throw new Error("Ta session a expiré. Reconnecte-toi et réessaie.");
      case "invalid_plan":
        throw new Error("Ce plan n'existe pas. Retourne sur la page tarifs.");
      case "invalid_request":
        throw new Error("Requête invalide. Réessaie.");
      case "checkout_unavailable":
        throw new Error("Le paiement est momentanément indisponible. Réessaie dans un instant.");
      default:
        throw new Error(data.error || "Une erreur est survenue. Réessaie.");
    }
  }

  return res.json() as Promise<CheckoutCreateResponse>;
}
