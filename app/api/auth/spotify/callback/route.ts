import { NextRequest, NextResponse } from "next/server";
import {
  readStateCookie,
  clearStateCookie,
  verifyState,
  setTokenCookies,
} from "@/lib/cookies";
import { exchangeCodeForTokens } from "@/lib/spotify";
import { isMoodDJPublisherOwner, saveMoodDJPublisherConnection } from "@/lib/mooddj-publisher";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function redirectWithError(reason: string) {
  return NextResponse.redirect(`${appUrl}/app?error=${encodeURIComponent(reason)}`);
}

type PendingSpotifyOAuth = {
  purpose: "user" | "publisher";
  state: string;
  ownerUid: string;
};

function parsePendingOAuthState(value: string | null): PendingSpotifyOAuth | null {
  if (!value) return null;

  // New structured format avoids ambiguous delimiters in a UID. Keep the
  // legacy parser temporarily so a user who started OAuth before deployment
  // can still complete the flow.
  try {
    const parsed = JSON.parse(value) as Partial<PendingSpotifyOAuth>;
    if (
      (parsed.purpose === "user" || parsed.purpose === "publisher") &&
      typeof parsed.state === "string" &&
      typeof parsed.ownerUid === "string"
    ) {
      return parsed as PendingSpotifyOAuth;
    }
  } catch {
    /* legacy state below */
  }

  const separator = value.indexOf(":");
  if (separator <= 0) return null;
  return {
    purpose: "user",
    state: value.slice(0, separator),
    ownerUid: value.slice(separator + 1),
  };
}

/** Handle Spotify's redirect back: verify state, exchange code, store tokens. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // User denied access on the Spotify consent screen.
  if (oauthError) {
    await clearStateCookie();
    return redirectWithError("access_denied");
  }

  // Verify the signed state cookie matches the returned state.
  const cookieState = await readStateCookie();
  const verified = verifyState(cookieState);
  await clearStateCookie();

  const pending = parsePendingOAuthState(verified);
  const expectedState = pending?.state ?? null;
  const ownerUid = pending?.ownerUid ?? null;

  if (!state || !expectedState || !ownerUid || expectedState !== state) {
    return redirectWithError("state_mismatch");
  }

  if (!code) {
    return redirectWithError("missing_code");
  }

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens(code);
    if (pending?.purpose === "publisher") {
      if (!isMoodDJPublisherOwner(ownerUid)) {
        return redirectWithError("publisher_setup_forbidden");
      }
      await saveMoodDJPublisherConnection(ownerUid, refreshToken);
      return NextResponse.redirect(`${appUrl}/settings?publisher_connected=1`);
    }
    await setTokenCookies(accessToken, refreshToken, expiresIn, ownerUid);
    return NextResponse.redirect(`${appUrl}/app?connected=1`);
  } catch {
    return redirectWithError("token_exchange_failed");
  }
}
