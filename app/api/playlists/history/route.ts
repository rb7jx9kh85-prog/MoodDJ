import { NextRequest, NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/quota";
import { getPlaylistHistory } from "@/lib/playlist-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The caller's past generated playlists, newest first. */
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const playlists = await getPlaylistHistory(uid);
  return NextResponse.json({ playlists });
}
