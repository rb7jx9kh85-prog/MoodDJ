import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { getValidAccessToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return NextResponse.json({ connected: false }, { status: 401 });
  return NextResponse.json({ connected: Boolean(await getValidAccessToken(uid)) });
}

