import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { setStateCookie } from "@/lib/cookies";
import { SPOTIFY_SCOPES } from "@/lib/auth";
import { getUidFromRequest } from "@/lib/quota";
import { isMoodDJPublisherOwner } from "@/lib/mooddj-publisher";

export const dynamic = "force-dynamic";

/**
 * Starts the one-time OAuth connection for Mood DJ's shared public Spotify
 * account. The server checks the Firebase UID again; the UI alone is never
 * trusted for this admin-only operation.
 */
export async function POST(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) {
    return NextResponse.json({ error: "Sign in first.", code: "not_authenticated" }, { status: 401 });
  }
  if (!isMoodDJPublisherOwner(uid)) {
    return NextResponse.json(
      {
        error: "Only the configured Mood DJ owner can connect the public Spotify account.",
        code: "publisher_setup_forbidden",
      },
      { status: 403 }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify is not configured on the server.", code: "spotify_error" },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  await setStateCookie(JSON.stringify({ purpose: "publisher", state, ownerUid: uid }));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    // Force an account chooser so the owner can explicitly select the
    // dedicated Mood DJ Spotify account, never a random existing session.
    show_dialog: "true",
  });

  return NextResponse.json({
    authorizeUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
  });
}
