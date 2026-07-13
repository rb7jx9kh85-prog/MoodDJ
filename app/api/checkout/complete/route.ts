import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getUidFromRequest } from "@/lib/quota";
import { getAdminDb } from "@/lib/firebase-admin";
import { isSelectablePlan, PLAN_CATALOG, type SelectablePlan } from "@/lib/plans";
import { resolveDiscountCode } from "@/lib/discount-codes";

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

  const originalPriceCents = catalogEntry.priceCents;
  const discountPercent = discount.valid ? discount.percent : 0;
  const discountAmountCents = Math.round((originalPriceCents * discountPercent) / 100);
  const finalPriceCents = Math.max(0, originalPriceCents - discountAmountCents);
  const paymentStatus: CheckoutCompleteResponse["paymentStatus"] =
    finalPriceCents === 0 ? "simulated_free" : "simulated_paid";

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
          discountCode: discount.valid ? discount.code : null,
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
    discountCode: discount.valid ? discount.code : null,
    paymentStatus,
  };
  return NextResponse.json(response);
}
