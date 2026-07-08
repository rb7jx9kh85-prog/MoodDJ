import { NextRequest, NextResponse } from "next/server";
import {
  readStateCookie,
  clearStateCookie,
  verifyState,
  setTokenCookies,
} from "@/lib/cookies";
import { exchangeCodeForTokens } from "@/lib/spotify";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function redirectWithError(reason: string) {
  return NextResponse.redirect(`${appUrl}/app?error=${encodeURIComponent(reason)}`);
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

  if (!state || !verified || verified !== state) {
    return redirectWithError("state_mismatch");
  }

  if (!code) {
    return redirectWithError("missing_code");
  }

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens(code);
    await setTokenCookies(accessToken, refreshToken, expiresIn);
    return NextResponse.redirect(`${appUrl}/app?connected=1`);
  } catch {
    return redirectWithError("token_exchange_failed");
  }
}
