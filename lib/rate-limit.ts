import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Firestore-backed fixed-window limiter. It works across Vercel instances and
 * needs no new service or environment variable. Old documents are harmless;
 * a Firestore TTL on expiresAt can be enabled later as housekeeping.
 */
export async function enforceRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const now = Date.now();
  const windowId = Math.floor(now / (windowSeconds * 1000));
  const safeSubject = subject.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  const ref = getAdminDb().collection("rateLimits").doc(`${scope}_${safeSubject}_${windowId}`);

  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = typeof snap.data()?.count === "number" ? snap.data()!.count : 0;
    if (count >= limit) {
      const retryAfter = Math.max(1, windowSeconds - Math.floor((now / 1000) % windowSeconds));
      throw new RateLimitError(retryAfter);
    }
    tx.set(
      ref,
      {
        count: count + 1,
        expiresAt: Timestamp.fromMillis((windowId + 2) * windowSeconds * 1000),
      },
      { merge: true }
    );
  });
}

