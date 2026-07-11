import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export type Plan = "free" | "flow" | "flow_sync";

export type UserQuota = {
  uid: string;
  plan: Plan;
  generationsUsed: number;
};

/** Verifies the Firebase ID token sent as `Authorization: Bearer <token>`. Returns null if missing/invalid. */
export async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    return decoded.uid;
  } catch {
    return null;
  }
}

function normalizePlan(raw: unknown): Plan {
  return raw === "flow" || raw === "flow_sync" ? raw : "free";
}

/** Reads the caller's plan + usage. Missing doc (shouldn't happen post sign-up) defaults to free/0. */
export async function getUserQuota(uid: string): Promise<UserQuota> {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  const data = snap.data() ?? {};
  return {
    uid,
    plan: normalizePlan(data.plan),
    generationsUsed: typeof data.generationsUsed === "number" ? data.generationsUsed : 0,
  };
}

/** Free plan gets exactly one lifetime generation; Flow and Flow Sync are unlimited. */
export function canGenerate(quota: UserQuota): boolean {
  return quota.plan !== "free" || quota.generationsUsed < 1;
}

/** Only Flow Sync can push to Spotify (create or update a playlist there). */
export function canPushToSpotify(quota: UserQuota): boolean {
  return quota.plan === "flow_sync";
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
