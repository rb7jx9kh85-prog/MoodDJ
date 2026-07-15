import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { linkReferral } from "@/lib/referral";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called once right after signup/sign-in with the referral code captured
 * from the URL (or null for an organic signup). Idempotent — safe to call
 * on every auth success.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await enforceRateLimit("referral_link", uid, 5, 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const rawCode = (body as { code?: unknown })?.code;
  const code = typeof rawCode === "string" && rawCode.trim() ? rawCode.trim() : null;

  await linkReferral(uid, code);
  return NextResponse.json({ ok: true });
}
