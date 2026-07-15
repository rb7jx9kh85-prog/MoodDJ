import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { ensureReferralProfile, serializeProfile, getTierProgress } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the caller's referral profile, creating it (with a fresh code) on first call. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await ensureReferralProfile(uid);
  return NextResponse.json({
    profile: serializeProfile(profile),
    tierProgress: getTierProgress(profile),
  });
}
