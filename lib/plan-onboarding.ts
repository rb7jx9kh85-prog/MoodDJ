import { doc, getDoc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { CheckoutCompleteResponse } from "@/app/api/checkout/complete/route";
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
 * Runs the fake checkout: the browser never writes plan/selectedPlan/price
 * fields to Firestore itself (firestore.rules forbids it). Instead this
 * calls the server, which verifies the caller's identity, recomputes the
 * price + discount itself, and activates the plan with the Admin SDK.
 */
export async function completeFakeCheckout(
  selectedPlan: SelectablePlan,
  discountCode?: string | null
): Promise<CheckoutCompleteResponse> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Tu dois être connecté pour finaliser ta commande.");
  }

  const idToken = await user.getIdToken();

  const res = await fetch("/api/checkout/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      plan: selectedPlan,
      discountCode: discountCode ?? null,
    }),
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
      default:
        throw new Error("Impossible de finaliser la simulation de paiement. Réessaie.");
    }
  }

  return res.json() as Promise<CheckoutCompleteResponse>;
}
