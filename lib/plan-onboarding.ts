import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

export type SelectablePlan =
  | "free"
  | "starter"
  | "creator"
  | "unlimited";

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

export async function completePlanOnboarding(
  selectedPlan: SelectablePlan
): Promise<void> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Tu dois être connecté pour choisir un plan.");
  }

  const userRef = doc(getFirebaseDb(), "users", user.uid);

  await updateDoc(userRef, {
    selectedPlan,
    onboardingCompleted: true,
    onboardingCompletedAt: serverTimestamp(),
  });
}