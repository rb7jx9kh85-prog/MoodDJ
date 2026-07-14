import { NextResponse } from "next/server";
import type { OwnedPlaylist } from "@/types";
import { getValidAccessToken } from "@/lib/auth";
import { getSpotifyMe, listOwnedPlaylists } from "@/lib/spotify";
import { withFreshToken, spotifyFailureResponse, errorJson } from "@/lib/spotify-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List the connected user's own Spotify playlists, for the "update existing"
 * picker. An API failure returns a real error — it must never be presented
 * to the client as an empty list.
 */
export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return errorJson("Connect your Spotify account first.", "not_connected", 401, true);
  }

  try {
    const me = await withFreshToken(accessToken, (t) => getSpotifyMe(t));
    const playlists = await withFreshToken(accessToken, (t) => listOwnedPlaylists(t, me.id));
    console.log("[/api/spotify/playlists] done", { count: playlists.length });
    const response: OwnedPlaylist[] = playlists;
    return NextResponse.json({ playlists: response });
  } catch (err) {
    return spotifyFailureResponse(err, {
      route: "/api/spotify/playlists",
      fallbackCode: "spotify_playlists_list_failed",
      fallbackMessage: "Could not load your Spotify playlists. Please try again.",
    });
  }
}
