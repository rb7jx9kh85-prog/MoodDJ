import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getUidFromRequest } from "@/lib/quota";
import { getAdminDb } from "@/lib/firebase-admin";
import { isSelectablePlan, PLAN_CATALOG, type SelectablePlan } from "@/lib/plans";
import { createWhopCheckoutUrl, getWhopPlanId } from "@/lib/whop";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

// firebase-admin needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CheckoutCreateResponse =
  | { kind: "free_activated" }
  | { kind: "redirect"; checkoutUrl: string };

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Starts a real checkout. The free plan is activated directly (no payment
 * involved); every paid plan gets a Whop checkout configuration with the
 * caller's Firebase uid attached as metadata, so the Whop webhook
 * (app/api/webhooks/whop/route.ts) can later activate the right account once
 * the payment actually succeeds. This route itself never grants a paid plan.
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

  const { plan } = (body ?? {}) as { plan?: unknown };
  if (!isSelectablePlan(plan)) {
    return errorResponse("invalid_plan", 400);
  }

  if (plan === "free") {
    try {
      await getAdminDb()
        .collection("users")
        .doc(uid)
        .set(
          {
            plan: PLAN_CATALOG.free.activePlan,
            selectedPlan: plan,
            planStatus: "active",
            onboardingCompleted: true,
            onboardingCompletedAt: FieldValue.serverTimestamp(),
            paymentMode: "none",
            checkoutUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (err) {
      console.error("[/api/checkout/create] Firestore write failed (free plan)", err);
      return errorResponse("server_error", 500);
    }

    const response: CheckoutCreateResponse = { kind: "free_activated" };
    return NextResponse.json(response);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  try {
    const planId = getWhopPlanId(plan as Exclude<SelectablePlan, "free">);
    const checkoutUrl = await createWhopCheckoutUrl({
      planId,
      metadata: { firebaseUid: uid, mooddjPlan: plan },
      redirectUrl: `${appUrl}/checkout/success?plan=${plan}`,
    });

    const response: CheckoutCreateResponse = { kind: "redirect", checkoutUrl };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[/api/checkout/create] Whop checkout creation failed", err);
    return errorResponse("checkout_unavailable", 502);
  }
}
