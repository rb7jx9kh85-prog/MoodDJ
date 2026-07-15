import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export type Plan = "free" | "flow" | "flow_sync" | "lifetime";

export type UserQuota = {
  uid: string;
  plan: Plan;
  generationsUsed: number;
  /** Bonus generations earned via the referral program — consumed before falling back to the plan limit. */
  bonusGenerationCredits: number;
};

/** Verifies the Firebase ID token sent as `Authorization: Bearer <token>`. Returns null if missing/invalid. */
export async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    return decoded.uid;
  } catch (err) {
    console.error("[quota] ID token verification failed", {
      message: (err as Error)?.message,
      code: (err as { code?: string })?.code,
    });
    return null;
  }
}

function normalizePlan(raw: unknown): Plan {
  return raw === "flow" || raw === "flow_sync" || raw === "lifetime" ? raw : "free";
}

/** Reads the caller's plan + usage. Missing doc (shouldn't happen post sign-up) defaults to free/0. */
export async function getUserQuota(uid: string): Promise<UserQuota> {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  const data = snap.data() ?? {};
  return {
    uid,
    plan: normalizePlan(data.plan),
    generationsUsed: typeof data.generationsUsed === "number" ? data.generationsUsed : 0,
    bonusGenerationCredits:
      typeof data.bonusGenerationCredits === "number" ? data.bonusGenerationCredits : 0,
  };
}

/**
 * Free plan gets exactly one lifetime generation, plus one more per unused
 * referral bonus credit; Flow and Flow Sync are unlimited (credits simply
 * aren't consumed for them — see consumeBonusCreditIfNeeded).
 */
export function canGenerate(quota: UserQuota): boolean {
  return quota.plan !== "free" || quota.generationsUsed < 1 || quota.bonusGenerationCredits > 0;
}

/** Whether this generation is only possible because of a referral bonus credit (free plan, quota otherwise exhausted). */
export function isUsingBonusCredit(quota: UserQuota): boolean {
  return quota.plan === "free" && quota.generationsUsed >= 1 && quota.bonusGenerationCredits > 0;
}

/** Consumes one bonus credit — call once per generation when isUsingBonusCredit(quota) was true. */
export async function consumeBonusCredit(uid: string): Promise<void> {
  await getAdminDb()
    .collection("users")
    .doc(uid)
    .set({ bonusGenerationCredits: FieldValue.increment(-1) }, { merge: true });
}

/** Flow Sync and Lifetime can push to Spotify (create or update a playlist there). */
export function canPushToSpotify(quota: UserQuota): boolean {
  return quota.plan === "flow_sync" || quota.plan === "lifetime";
}

export async function recordGeneration(uid: string): Promise<void> {
  await getAdminDb()
    .collection("users")
    .doc(uid)
    .set(
      { generationsUsed: FieldValue.increment(1), lastGeneratedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}
