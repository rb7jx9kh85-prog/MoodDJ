import crypto from "node:crypto";
import type { SelectablePlan } from "@/lib/plans";

// Server-only Whop API client. Never import this from a "use client" file —
// it reads WHOP_API_KEY / WHOP_WEBHOOK_SECRET, which must never reach the browser.

const WHOP_API_BASE = "https://api.whop.com/api/v1";

/** Maps a Mood DJ selectable plan to the env var holding its Whop plan id. */
const WHOP_PLAN_ENV_VAR: Record<Exclude<SelectablePlan, "free">, string> = {
  starter: "WHOP_PLAN_ID_STARTER",
  creator: "WHOP_PLAN_ID_CREATOR",
  unlimited: "WHOP_PLAN_ID_UNLIMITED",
};

export function getWhopPlanId(plan: Exclude<SelectablePlan, "free">): string {
  const envVar = WHOP_PLAN_ENV_VAR[plan];
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing ${envVar} — create the plan in the Whop dashboard and set it in the environment.`);
  }
  return value;
}

export type WhopCheckoutMetadata = {
  firebaseUid: string;
  mooddjPlan: SelectablePlan;
};

/**
 * Creates a Whop checkout configuration for a specific plan and returns the
 * URL to redirect the customer to. Using the API (rather than a static
 * dashboard checkout link) lets us attach `metadata` that Whop echoes back on
 * the payment.succeeded webhook, which is how the webhook maps a payment back
 * to a Firebase user.
 */
export async function createWhopCheckoutUrl(params: {
  planId: string;
  metadata: WhopCheckoutMetadata;
  redirectUrl: string;
}): Promise<string> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing WHOP_API_KEY.");
  }

  const res = await fetch(`${WHOP_API_BASE}/checkout_configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: params.planId,
      redirect_url: params.redirectUrl,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Whop checkout_configurations request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { purchase_url?: string };
  if (!data.purchase_url) {
    throw new Error("Whop checkout_configurations response is missing purchase_url.");
  }

  return data.purchase_url.startsWith("http")
    ? data.purchase_url
    : `https://whop.com${data.purchase_url}`;
}

/**
 * Verifies a Whop webhook per the Standard Webhooks spec: HMAC-SHA256 over
 * "{id}.{timestamp}.{rawBody}" using the base64-decoded webhook secret,
 * compared against the base64 signature in the `webhook-signature` header.
 */
export function verifyWhopWebhookSignature(params: {
  id: string;
  timestamp: string;
  rawBody: string;
  signatureHeader: string;
  secret: string;
}): boolean {
  const secretBytes = Buffer.from(params.secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${params.id}.${params.timestamp}.${params.rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // webhook-signature can contain multiple space-separated "v1,<sig>" values.
  const candidates = params.signatureHeader
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter((sig): sig is string => Boolean(sig));

  return candidates.some((candidate) => {
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
