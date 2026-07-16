import { FieldValue } from "firebase-admin/firestore";
import { openServerSecret, sealServerSecret } from "@/lib/cookies";
import { getAdminDb } from "@/lib/firebase-admin";
import { refreshSpotifyToken, SpotifyAuthError } from "@/lib/spotify";

const PUBLISHER_DOC = "serviceSecrets/spotifyPublisher";

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

export class MoodDJPublisherUnavailableError extends Error {
  constructor(message = "Mood DJ public Spotify account is not configured") {
    super(message);
    this.name = "MoodDJPublisherUnavailableError";
  }
}

/** The Firebase UID allowed to connect or replace the shared Spotify account. */
export function isMoodDJPublisherOwner(uid: string): boolean {
  const ownerUid = process.env.MOODDJ_PUBLISHER_OWNER_UID;
  return Boolean(ownerUid && uid === ownerUid);
}

export async function isMoodDJPublisherConfigured(): Promise<boolean> {
  const snap = await getAdminDb().doc(PUBLISHER_DOC).get();
  return typeof snap.data()?.encryptedRefreshToken === "string";
}

/**
 * Stores the refresh token encrypted in a Firestore document that browser
 * rules deny completely. Only the configured Mood DJ owner can change it.
 */
export async function saveMoodDJPublisherConnection(uid: string, refreshToken: string): Promise<void> {
  if (!isMoodDJPublisherOwner(uid)) {
    throw new MoodDJPublisherUnavailableError("Only the Mood DJ owner can configure the publisher account.");
  }

  await getAdminDb().doc(PUBLISHER_DOC).set(
    {
      encryptedRefreshToken: sealServerSecret(refreshToken),
      ownerUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  cachedToken = null;
}

async function refreshPublisherAccessToken(force = false): Promise<string> {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const snap = await getAdminDb().doc(PUBLISHER_DOC).get();
  const encryptedRefreshToken = snap.data()?.encryptedRefreshToken;
  const refreshToken =
    typeof encryptedRefreshToken === "string" ? openServerSecret(encryptedRefreshToken) : null;

  if (!refreshToken) {
    throw new MoodDJPublisherUnavailableError();
  }

  try {
    const refreshed = await refreshSpotifyToken(refreshToken);
    cachedToken = {
      accessToken: refreshed.accessToken,
      expiresAt: Date.now() + Math.max(60, refreshed.expiresIn - 60) * 1000,
    };

    // Spotify may rotate refresh tokens. Persist the new encrypted token so
    // the public publisher connection survives restarts and deployments.
    if (refreshed.refreshToken && refreshed.refreshToken !== refreshToken) {
      await getAdminDb().doc(PUBLISHER_DOC).set(
        {
          encryptedRefreshToken: sealServerSecret(refreshed.refreshToken),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return refreshed.accessToken;
  } catch (err) {
    console.error("[mooddj-publisher] Could not refresh public Spotify connection", {
      reason: err instanceof Error ? err.message : String(err),
    });
    throw new MoodDJPublisherUnavailableError("The Mood DJ public Spotify connection needs to be reconnected.");
  }
}

/** Runs an operation with the shared publisher token and retries once on 401. */
export async function withMoodDJPublisherToken<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
  const accessToken = await refreshPublisherAccessToken();
  try {
    return await operation(accessToken);
  } catch (err) {
    if (!(err instanceof SpotifyAuthError)) throw err;
    const renewed = await refreshPublisherAccessToken(true);
    return operation(renewed);
  }
}

/** Server-only ownership record for public playlists created on the shared account. */
export async function recordMoodDJPublicPlaylist(uid: string, playlistId: string): Promise<void> {
  await getAdminDb().collection("moodDJPublicPlaylists").doc(playlistId).set({
    uid,
    playlistId,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Prevent one user from changing the cover of another user's shared playlist. */
export async function userOwnsMoodDJPublicPlaylist(uid: string, playlistId: string): Promise<boolean> {
  const snap = await getAdminDb().collection("moodDJPublicPlaylists").doc(playlistId).get();
  return snap.data()?.uid === uid;
}
