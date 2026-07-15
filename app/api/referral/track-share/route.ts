import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { recordShare } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Called when the share sheet's native share or copy-link actually succeeds. */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await recordShare(uid);
  return NextResponse.json({ ok: true });
}
