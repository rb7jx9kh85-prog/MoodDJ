import { NextRequest, NextResponse } from "next/server";
import { clearTokenCookies } from "@/lib/cookies";
import { getUidFromRequest } from "@/lib/quota";

export const dynamic = "force-dynamic";

/** Clear Spotify cookies for an authenticated Mood DJ user. */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  await clearTokenCookies();
  return NextResponse.json({ ok: true });
}
