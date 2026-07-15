import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { recordShare } from "@/lib/referral";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Called when the share sheet's native share or copy-link actually succeeds. */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await enforceRateLimit("referral_share", uid, 10, 60);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    throw err;
  }

  await recordShare(uid);
  return NextResponse.json({ ok: true });
}
