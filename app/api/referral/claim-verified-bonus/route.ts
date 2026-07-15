import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { claimRefereeVerifiedBonus } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the client after it notices (via a reloaded Firebase Auth user)
 * that its own email just became verified. Re-verifies server-side via
 * Admin Auth before granting anything — the client's claim alone proves
 * nothing.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await claimRefereeVerifiedBonus(uid);
  return NextResponse.json(result);
}
