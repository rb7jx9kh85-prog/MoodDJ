import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { setStateCookie } from "@/lib/cookies";
import { SPOTIFY_SCOPES } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Build the Spotify authorize URL and redirect the user there. */
export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify is not configured on the server." },
      { status: 500 }
    );
  }

  // CSRF protection: random state, stored signed in an httpOnly cookie.
  const state = randomBytes(16).toString("hex");
  await setStateCookie(state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    show_dialog: "false",
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
