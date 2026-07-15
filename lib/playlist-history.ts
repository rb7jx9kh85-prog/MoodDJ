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
  const ref = historyCollection.doc();
  const userRef = db.collection("users").doc(uid);
  const isFirstEver = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const first = userSnap.data()?.hasGeneratedPlaylist !== true;
    tx.set(userRef, { hasGeneratedPlaylist: true }, { merge: true });
    tx.set(ref, {
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
       coverImageUrl: data.coverImageUrl ?? null,
       createdAt: FieldValue.serverTimestamp(),
    });
     return first;
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
