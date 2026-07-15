// Referral & ambassador program types — MVP scope only (Explorer/Creator/Ambassador).
// See the technical spec for the full future scope (Elite/Legend, Creator Program,
// Discord, challenges, cash commissions) — deliberately not implemented yet.

import type { Timestamp } from "firebase-admin/firestore";

export type UserTier = "explorer" | "creator" | "ambassador";

export type ReferralStatus =
  | "signed_up" // account created, email not verified yet
  | "verified" // email verified — referee welcome bonus granted
  | "activated" // referee generated their first playlist
  | "rewarded" // referrer's reward has been granted
  | "rejected"; // blocked by a fraud flag

export type FraudFlag = "disposable_email";

export type RewardType = "generation_credits";

export interface RewardGrant {
  type: RewardType;
  value: number;
  grantedAt: Timestamp;
}

export interface UserReferralProfile {
  uid: string;
  referralCode: string;
  referredByUid: string | null;
  referredByCode: string | null;
  tier: UserTier;
  tierAchievedAt: Record<UserTier, Timestamp | null>;
  totalReferralsSent: number;
  totalReferralsActivated: number;
  playlistsGenerated: number;
  sharesCount: number;
  creditsBalance: number;
  lifetimeCreditsEarned: number;
  refereeBonusClaimed: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Referral {
  id: string;
  referrerUid: string;
  referrerCode: string;
  refereeUid: string;
  status: ReferralStatus;
  source: "link" | "code_manual";
  signedUpAt: Timestamp;
  verifiedAt: Timestamp | null;
  activatedAt: Timestamp | null;
  rewardedAt: Timestamp | null;
  fraudFlags: FraudFlag[];
  rewardGrantedToReferrer: RewardGrant | null;
}

export interface RewardLedgerEntry {
  id: string;
  uid: string;
  referralId: string | null;
  type: RewardType;
  value: number;
  direction: "credit";
  reason: "referral_activated" | "referee_verified_bonus";
  createdAt: Timestamp;
}

export interface PlaylistHistoryEntry {
  id: string;
  uid: string;
  playlistName: string;
  playlistDescription: string;
  vibe: string;
  genres: string[];
  energy: number;
  trackCount: number;
  tracks: Array<{
    id: string;
    name: string;
    artist: string;
    image?: string;
    uri: string;
    spotifyUrl: string;
  }>;
  pushedToSpotify: boolean;
  spotifyPlaylistUrl: string | null;
  coverImageUrl: string | null;
  createdAt: Timestamp;
}

/** Serialized (client-facing) versions — Timestamps become ISO strings over JSON. */
export type UserReferralProfileDTO = Omit<
  UserReferralProfile,
  "tierAchievedAt" | "createdAt" | "updatedAt"
> & {
  tierAchievedAt: Record<UserTier, string | null>;
  createdAt: string;
  updatedAt: string;
};

export type FriendsLeaderboardEntryDTO = {
  uid: string;
  displayName: string;
  tier: UserTier;
  totalReferralsActivated: number;
  playlistsGenerated: number;
  isYou: boolean;
};

export type PlaylistHistoryEntryDTO = Omit<PlaylistHistoryEntry, "createdAt"> & {
  createdAt: string;
};
