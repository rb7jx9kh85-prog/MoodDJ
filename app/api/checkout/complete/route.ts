import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getUidFromRequest } from "@/lib/quota";
import { getAdminDb } from "@/lib/firebase-admin";
import { isSelectablePlan, PLAN_CATALOG, type SelectablePlan } from "@/lib/plans";
import { resolveDiscountCode } from "@/lib/discount-codes";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

// firebase-admin needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CheckoutCompleteResponse = {
  plan: SelectablePlan;
  activePlan: string;
  originalPriceCents: number;
  discountAmountCents: number;
  finalPriceCents: number;
  discountPercent: number;
  discountCode: string | null;
  paymentStatus: "simulated_free" | "simulated_paid";
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Fake checkout activation. No payment provider is involved anywhere in this
 * route — it only ever computes a price server-side from the fixed
 * PLAN_CATALOG + discount-codes catalog, then flips the caller's own
 * Firestore profile to that plan via the Admin SDK (which bypasses
 * firestore.rules, the only place allowed to do so). The browser cannot
 * reach this outcome any other way: firestore.rules blocks client writes to
 * plan/selectedPlan/planStatus/onboardingCompleted.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return errorResponse("not_authenticated", 401);
  }
  try {
    await enforceRateLimit("checkout", uid, 10, 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans un instant." },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", 400);
  }

  const { plan, discountCode } = (body ?? {}) as {
    plan?: unknown;
    discountCode?: unknown;
  };

  if (!isSelectablePlan(plan)) {
    return errorResponse("invalid_plan", 400);
  }

  const catalogEntry = PLAN_CATALOG[plan];
  const rawDiscountCode = typeof discountCode === "string" ? discountCode : null;
  const discount = resolveDiscountCode(rawDiscountCode, plan);

  // Mood DJ is invite-only while real billing is unavailable. Never activate
  // a plan from card-shaped data supplied by the browser: only a server-side
  // invitation-code match is authoritative.
  if (!discount.valid || discount.percent !== 100) {
    return errorResponse("Vous n’êtes pas autorisé à utiliser le service.", 403);
  }

  const originalPriceCents = catalogEntry.priceCents;
  const discountPercent = discount.percent;
  const discountAmountCents = Math.round((originalPriceCents * discountPercent) / 100);
  const finalPriceCents = Math.max(0, originalPriceCents - discountAmountCents);
  const paymentStatus: CheckoutCompleteResponse["paymentStatus"] = "simulated_free";

  try {
    await getAdminDb()
      .collection("users")
      .doc(uid)
      .set(
        {
          plan: catalogEntry.activePlan,
          selectedPlan: plan,
          planStatus: "active",
          onboardingCompleted: true,
          onboardingCompletedAt: FieldValue.serverTimestamp(),
          paymentMode: "fake_checkout",
          paymentStatus,
          billingCurrency: catalogEntry.currency,
          originalPriceCents,
          discountAmountCents,
          finalPriceCents,
          discountCode: discount.code,
          discountPercent,
          checkoutUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (err) {
    console.error("[/api/checkout/complete] Firestore write failed", err);
    return errorResponse("server_error", 500);
  }

  const response: CheckoutCompleteResponse = {
    plan,
    activePlan: catalogEntry.activePlan,
    originalPriceCents,
    discountAmountCents,
    finalPriceCents,
    discountPercent,
    discountCode: discount.code,
    paymentStatus,
  };
  return NextResponse.json(response);
}
