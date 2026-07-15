import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { getFriendsLeaderboard } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Friends-only leaderboard: the caller + their referrer + everyone they referred. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const entries = await getFriendsLeaderboard(uid);
  return NextResponse.json({ entries });
}
