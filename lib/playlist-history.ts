import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PlaylistHistoryEntry, PlaylistHistoryEntryDTO } from "@/types/referral";
import type { GeneratedPlaylistResponse } from "@/types";

// Most recent playlists shown in the history view.
const HISTORY_LIMIT = 50;

/**
 * Persists a generated playlist to the user's history. Returns whether this
 * was the user's first-ever generation — the exact signal referral
 * activation (lib/referral.ts) needs, so this must run before that check.
 *
 * Requires a composite Firestore index: playlistHistory (uid ASC, createdAt DESC).
 */
export async function recordPlaylistHistory(
  uid: string,
  data: GeneratedPlaylistResponse
): Promise<{ isFirstEver: boolean }> {
  const db = getAdminDb();
  const historyCollection = db.collection("playlistHistory");

  const existing = await historyCollection.where("uid", "==", uid).limit(1).get();
  const isFirstEver = existing.empty;

  const ref = historyCollection.doc();
  await ref.set({
    id: ref.id,
    uid,
    playlistName: data.playlistName,
    playlistDescription: data.playlistDescription,
    vibe: data.vibe,
    genres: data.genres,
    energy: data.energy,
    trackCount: data.tracks.length,
    tracks: data.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artist,
      image: t.image ?? null,
      uri: t.uri,
      spotifyUrl: t.spotifyUrl,
    })),
    pushedToSpotify: data.pushedToSpotify,
    spotifyPlaylistUrl: data.spotifyPlaylistUrl ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { isFirstEver };
}

export async function getPlaylistHistory(uid: string): Promise<PlaylistHistoryEntryDTO[]> {
  const db = getAdminDb();
  const snap = await db
    .collection("playlistHistory")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(HISTORY_LIMIT)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as PlaylistHistoryEntry;
    return { ...data, createdAt: data.createdAt.toDate().toISOString() };
  });
}
