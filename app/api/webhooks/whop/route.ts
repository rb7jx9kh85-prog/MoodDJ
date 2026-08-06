import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { isSelectablePlan, PLAN_CATALOG, type SelectablePlan } from "@/lib/plans";
import { verifyWhopWebhookSignature } from "@/lib/whop";

// firebase-admin needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WhopWebhookPayload = {
  id?: string;
  event?: string;
  action?: string;
  data?: {
    id?: string;
    status?: string;
    metadata?: { firebaseUid?: string; mooddjPlan?: string };
  };
};

/**
 * Receives Whop's payment/membership webhooks and is the ONLY place that
 * ever activates a paid plan — it only does so once Whop has confirmed the
 * payment server-side, using the firebaseUid we attached as checkout
 * metadata in /api/checkout/create. A redirect back to /checkout/success is
 * never itself proof of payment.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[/api/webhooks/whop] WHOP_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const id = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const signatureHeader = req.headers.get("webhook-signature");
  const rawBody = await req.text();

  if (!id || !timestamp || !signatureHeader) {
    return NextResponse.json({ error: "missing_signature_headers" }, { status: 400 });
  }

  const valid = verifyWhopWebhookSignature({ id, timestamp, rawBody, signatureHeader, secret });
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: WhopWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const eventName = payload.event ?? payload.action;
  if (eventName !== "payment.succeeded") {
    // Ignore every other event type (refunds, membership churn, etc. can be
    // added here later); Whop still expects a 200 so it doesn't retry.
    return NextResponse.json({ received: true });
  }

  const eventId = payload.id ?? payload.data?.id;
  const uid = payload.data?.metadata?.firebaseUid;
  const planRaw = payload.data?.metadata?.mooddjPlan;

  if (!eventId || !uid || !isSelectablePlan(planRaw) || planRaw === "free") {
    console.error("[/api/webhooks/whop] payment.succeeded missing expected metadata", {
      eventId,
      uid,
      planRaw,
    });
    return NextResponse.json({ error: "invalid_metadata" }, { status: 400 });
  }

  const plan = planRaw as SelectablePlan;
  const db = getAdminDb();

  // Idempotency: Whop may redeliver the same event. Claim it once via a
  // create-only write before touching the user's plan.
  const eventRef = db.collection("whopWebhookEvents").doc(eventId);
  try {
    await eventRef.create({ receivedAt: FieldValue.serverTimestamp(), uid, plan });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const catalogEntry = PLAN_CATALOG[plan];

  try {
    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          plan: catalogEntry.activePlan,
          selectedPlan: plan,
          planStatus: "active",
          onboardingCompleted: true,
          onboardingCompletedAt: FieldValue.serverTimestamp(),
          paymentMode: "whop",
          paymentStatus: "paid",
          billingCurrency: catalogEntry.currency,
          finalPriceCents: catalogEntry.priceCents,
          whopPaymentId: eventId,
          checkoutUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (err) {
    console.error("[/api/webhooks/whop] Firestore write failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
