import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { isMoodDJPublisherConfigured, isMoodDJPublisherOwner } from "@/lib/mooddj-publisher";

export const dynamic = "force-dynamic";

/** Public configuration state only — no token or account data ever leaves the server. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  const configured = await isMoodDJPublisherConfigured();
  return NextResponse.json({
    configured,
    canConfigure: Boolean(uid && isMoodDJPublisherOwner(uid)),
  });
}
