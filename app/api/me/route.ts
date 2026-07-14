import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest, getUserQuota } from "@/lib/quota";

// firebase-admin (via lib/quota) needs Node APIs, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the caller's plan + usage, for display in Settings. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const quota = await getUserQuota(uid);
  return NextResponse.json({ plan: quota.plan, generationsUsed: quota.generationsUsed });
}
