import { NextResponse } from "next/server";
import { clearTokenCookies } from "@/lib/cookies";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Clear Spotify cookies and return to the home page. */
export async function GET() {
  await clearTokenCookies();
  return NextResponse.redirect(appUrl);
}
