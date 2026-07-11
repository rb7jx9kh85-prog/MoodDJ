import { NextResponse } from "next/server";
import type { ApiErrorCode, OwnedPlaylist } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import { clearTokenCookies } from "@/lib/cookies";
import { getSpotifyMe, listOwnedPlaylists, SpotifyAuthError, SpotifyApiError } from "@/lib/spotify";

export const dynamic = "force-dynamic";

function errorResponse(message: string, code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/** List the connected user's own Spotify playlists, for the "update existing" picker. */
export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return errorResponse("Connect your Spotify account first.", "not_connected", 401);
  }

  try {
    const me = await getSpotifyMe(accessToken);
    const playlists = await listOwnedPlaylists(accessToken, me.id);
    const response: OwnedPlaylist[] = playlists;
    return NextResponse.json({ playlists: response });
  } catch (err) {
    if (err instanceof SpotifyAuthError) {
      await clearTokenCookies();
      return errorResponse("Your Spotify session expired. Please connect again.", "session_expired", 401);
    }
    const status = err instanceof SpotifyApiError ? err.status : undefined;
    console.error("[/api/spotify/playlists] Spotify error", { status, err });
    return errorResponse("Could not load your Spotify playlists.", "spotify_error", 502);
  }
}
