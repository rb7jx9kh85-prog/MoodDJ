import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type {
  UserReferralProfile,
  UserReferralProfileDTO,
  Referral,
  UserTier,
  FriendsLeaderboardEntryDTO,
} from "@/types/referral";

// ── Referral codes ───────────────────────────────────────────────────────────

// No ambiguous characters (0/O, 1/I) — codes get read aloud / typed manually.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function generateReferralCode(): string {
  return `MOOD-${randomCode()}`;
}

// ── Anti-fraud: disposable email blocklist ──────────────────────────────────
// Static list of well-known disposable/temporary email domains. Checked
// against the *Firebase Auth* email (server-side, tamper-proof), never a
// client-supplied value.

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "tempmail.com",
  "temp-mail.org", "temp-mail.io", "temp-mail.de", "tempmailo.com", "tempinbox.com",
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf",
  "trashmail.com", "trashmail.me", "trashmail.net", "trash-mail.com",
  "throwawaymail.com", "throwaway.email", "sharklasers.com", "grr.la",
  "dispostable.com", "getnada.com", "getairmail.com", "maildrop.cc",
  "mintemail.com", "fakeinbox.com", "mohmal.com", "mohmal.im",
  "emailondeck.com", "mailnesia.com", "spam4.me", "mytemp.email",
  "mailcatch.com", "mail-temporaire.fr", "jetable.org", "moakt.com", "moakt.cc",
  "tempail.com", "tempr.email", "fake-mail.net", "fakemailgenerator.com",
  "burnermail.io", "emailfake.com", "inboxbear.com", "mailsac.com",
  "einrot.com", "mailmoat.com", "spamgourmet.com",
  "discard.email", "discardmail.com", "spambog.com", "spambox.us",
  "tempmailaddress.com", "luxusmail.org", "mytrashmail.com", "no-spam.ws",
  "objectmail.com", "proxymail.eu", "rcpt.at", "recode.me", "recursor.net",
  "rmqkr.net", "s0ny.net", "trash2009.com", "trashdevil.com", "trashemail.de",
  "trashymail.com", "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "wh4f.org", "willselfdestruct.com", "wuzup.net", "wuzupmail.net", "xagloo.com",
  "zippymail.info", "1secmail.com", "1secmail.net", "1secmail.org", "33mail.com",
  "anonbox.net", "anonymbox.com", "deadaddress.com", "despam.it", "devnullmail.com",
  "dodgeit.com", "dodgit.com", "e4ward.com", "explodemail.com", "gishpuppy.com",
  "hidemail.de", "instant-mail.de", "koszmail.pl", "kurzepost.de", "lifebyfood.com",
  "meltmail.com", "nowmymail.com", "onewaymail.com", "pookmail.com", "quickinbox.com",
  "sofimail.com", "spamavert.com", "spamcannon.com", "spamex.com", "spamfree24.org",
  "spaml.com", "spamspot.com", "supergreatmail.com", "tempemail.net", "tempinbox.co.uk",
  "thisisnotmyrealemail.com", "tradermail.info", "tyldd.com", "veryrealemail.com",
  "zoemail.org", "nada.email", "harakirimail.com", "chammy.info", "mailtemp.info",
]);

export function isDisposableEmail(email: string | null | undefined): boolean {
  const domain = email?.split("@")[1]?.toLowerCase().trim();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

// ── Tiers ────────────────────────────────────────────────────────────────────

export const TIER_ORDER: UserTier[] = ["explorer", "creator", "ambassador"];

const TIER_REWARD_CREDITS: Record<UserTier, number> = {
  explorer: 3,
  creator: 5,
  ambassador: 8,
};

export const REFEREE_WELCOME_CREDITS = 2;

export function getReferralRewardCredits(referrerTier: UserTier): number {
  return TIER_REWARD_CREDITS[referrerTier];
}

function meetsTier(
  tier: UserTier,
  counters: Pick<UserReferralProfile, "playlistsGenerated" | "sharesCount" | "totalReferralsActivated">
): boolean {
  switch (tier) {
    case "creator":
      return counters.playlistsGenerated >= 10 || counters.sharesCount >= 1;
    case "ambassador":
      return counters.totalReferralsActivated >= 5;
    default:
      return true;
  }
}

/** Highest tier the current counters qualify for — never demotes below the recorded tier. */
export function computeEligibleTier(
  profile: Pick<
    UserReferralProfile,
    "playlistsGenerated" | "sharesCount" | "totalReferralsActivated" | "tier"
  >
): UserTier {
  let eligible: UserTier = "explorer";
  for (const tier of TIER_ORDER) {
    if (meetsTier(tier, profile)) eligible = tier;
  }
  const currentIdx = TIER_ORDER.indexOf(profile.tier);
  const eligibleIdx = TIER_ORDER.indexOf(eligible);
  return eligibleIdx > currentIdx ? eligible : profile.tier;
}

export function getTierProgress(
  profile: Pick<UserReferralProfile, "tier" | "playlistsGenerated" | "totalReferralsActivated">
): { nextTier: UserTier; currentValue: number; targetValue: number } | null {
  const idx = TIER_ORDER.indexOf(profile.tier);
  const nextTier = TIER_ORDER[idx + 1];
  if (!nextTier) return null;
  if (nextTier === "creator") {
    return { nextTier, currentValue: profile.playlistsGenerated, targetValue: 10 };
  }
  return { nextTier, currentValue: profile.totalReferralsActivated, targetValue: 5 };
}

function tierUpdateFields(
  profile: UserReferralProfile,
  nextTier: UserTier
): Record<string, unknown> {
  if (nextTier === profile.tier) return {};
  return {
    tier: nextTier,
    tierAchievedAt: { ...profile.tierAchievedAt, [nextTier]: FieldValue.serverTimestamp() },
  };
}

// ── Profile lifecycle ────────────────────────────────────────────────────────

/** Idempotent: creates the profile (with a fresh unique code) on first call. */
export async function ensureReferralProfile(uid: string): Promise<UserReferralProfile> {
  const db = getAdminDb();
  const ref = db.collection("referralProfiles").doc(uid);
  const existing = await ref.get();
  if (existing.exists) return existing.data() as UserReferralProfile;

  let code = generateReferralCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const collision = await db
      .collection("referralProfiles")
      .where("referralCode", "==", code)
      .limit(1)
      .get();
    if (collision.empty) break;
    code = generateReferralCode();
  }

  await ref.set(
    {
      uid,
      referralCode: code,
      referredByUid: null,
      referredByCode: null,
      tier: "explorer",
      tierAchievedAt: { explorer: FieldValue.serverTimestamp(), creator: null, ambassador: null },
      totalReferralsSent: 0,
      totalReferralsActivated: 0,
      playlistsGenerated: 0,
      sharesCount: 0,
      creditsBalance: 0,
      lifetimeCreditsEarned: 0,
      refereeBonusClaimed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const created = await ref.get();
  return created.data() as UserReferralProfile;
}

/**
 * Called once right after signup/sign-in. Idempotent and safe to call on
 * every auth success (organic sign-ins pass a null code and this becomes a
 * no-op beyond ensuring the profile exists).
 */
export async function linkReferral(refereeUid: string, rawCode: string | null): Promise<void> {
  const db = getAdminDb();
  await ensureReferralProfile(refereeUid);
  const refereeProfileRef = db.collection("referralProfiles").doc(refereeUid);
  const refereeProfile = (await refereeProfileRef.get()).data() as UserReferralProfile;

  if (!rawCode || refereeProfile.referredByUid) return;

  const code = rawCode.trim().toUpperCase();
  const referrerQuery = await db
    .collection("referralProfiles")
    .where("referralCode", "==", code)
    .limit(1)
    .get();
  if (referrerQuery.empty) return;

  const referrerDoc = referrerQuery.docs[0];
  const referrerUid = referrerDoc.id;
  if (referrerUid === refereeUid) return;

  const referralRef = db.collection("referrals").doc(refereeUid);
  if ((await referralRef.get()).exists) return;

  const refereeAuthUser = await getAdminAuth().getUser(refereeUid);
  const fraudFlags = isDisposableEmail(refereeAuthUser.email) ? (["disposable_email"] as const) : [];

  const batch = db.batch();
  batch.set(referralRef, {
    id: refereeUid,
    referrerUid,
    referrerCode: code,
    refereeUid,
    status: "signed_up",
    source: "link",
    signedUpAt: FieldValue.serverTimestamp(),
    verifiedAt: null,
    activatedAt: null,
    rewardedAt: null,
    fraudFlags,
    rewardGrantedToReferrer: null,
  });
  batch.set(
    refereeProfileRef,
    { referredByUid: referrerUid, referredByCode: code, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  batch.set(
    referrerDoc.ref,
    { totalReferralsSent: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
}

/**
 * Called when the client notices (via a reloaded Firebase Auth user) that
 * its email just became verified. Re-checks `emailVerified` server-side —
 * never trusts the client's claim. Grants the referee's one-time welcome
 * bonus. No-op for organic users (no referral doc) or disposable emails.
 */
export async function claimRefereeVerifiedBonus(uid: string): Promise<{ granted: boolean }> {
  const authUser = await getAdminAuth().getUser(uid);
  if (!authUser.emailVerified) return { granted: false };

  const db = getAdminDb();
  const referralRef = db.collection("referrals").doc(uid);
  const profileRef = db.collection("referralProfiles").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const ledgerRef = db.collection("rewardLedger").doc();

  return db.runTransaction(async (tx) => {
    const [referralSnap, profileSnap] = await Promise.all([tx.get(referralRef), tx.get(profileRef)]);
    if (!referralSnap.exists || !profileSnap.exists) return { granted: false };

    const referral = referralSnap.data() as Referral;
    const profile = profileSnap.data() as UserReferralProfile;
    if (
      profile.refereeBonusClaimed ||
      referral.status !== "signed_up" ||
      referral.fraudFlags.length > 0
    ) {
      return { granted: false };
    }

    tx.set(ledgerRef, {
      id: ledgerRef.id,
      uid,
      referralId: referral.id,
      type: "generation_credits",
      value: REFEREE_WELCOME_CREDITS,
      direction: "credit",
      reason: "referee_verified_bonus",
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      profileRef,
      {
        refereeBonusClaimed: true,
        creditsBalance: FieldValue.increment(REFEREE_WELCOME_CREDITS),
        lifetimeCreditsEarned: FieldValue.increment(REFEREE_WELCOME_CREDITS),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    tx.set(userRef, { bonusGenerationCredits: FieldValue.increment(REFEREE_WELCOME_CREDITS) }, { merge: true });
    tx.set(referralRef, { status: "verified", verifiedAt: FieldValue.serverTimestamp() }, { merge: true });

    return { granted: true };
  });
}

/**
 * Called right after a user's *first-ever* playlist generation. Rewards the
 * referrer — never the referee's signup alone. Silently no-ops on fraud
 * flags or missing email verification (retried on the referee's next
 * generation, since the referral stays in "signed_up"/"verified" until this
 * succeeds).
 */
export async function activateReferralIfEligible(refereeUid: string): Promise<void> {
  const db = getAdminDb();
  const referralRef = db.collection("referrals").doc(refereeUid);
  const referralSnap = await referralRef.get();
  if (!referralSnap.exists) return;

  const referral = referralSnap.data() as Referral;
  if (referral.status === "rewarded" || referral.status === "rejected") return;
  if (referral.fraudFlags.length > 0) return;

  const refereeAuthUser = await getAdminAuth().getUser(refereeUid);
  if (!refereeAuthUser.emailVerified) return;

  const referrerProfileRef = db.collection("referralProfiles").doc(referral.referrerUid);
  const referrerUserRef = db.collection("users").doc(referral.referrerUid);
  const ledgerRef = db.collection("rewardLedger").doc();

  await db.runTransaction(async (tx) => {
    const referrerProfileSnap = await tx.get(referrerProfileRef);
    if (!referrerProfileSnap.exists) return;
    const referrerProfile = referrerProfileSnap.data() as UserReferralProfile;

    const rewardValue = getReferralRewardCredits(referrerProfile.tier);
    const nextTier = computeEligibleTier({
      ...referrerProfile,
      totalReferralsActivated: referrerProfile.totalReferralsActivated + 1,
    });

    tx.set(ledgerRef, {
      id: ledgerRef.id,
      uid: referral.referrerUid,
      referralId: referral.id,
      type: "generation_credits",
      value: rewardValue,
      direction: "credit",
      reason: "referral_activated",
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      referrerProfileRef,
      {
        totalReferralsActivated: FieldValue.increment(1),
        creditsBalance: FieldValue.increment(rewardValue),
        lifetimeCreditsEarned: FieldValue.increment(rewardValue),
        updatedAt: FieldValue.serverTimestamp(),
        ...tierUpdateFields(referrerProfile, nextTier),
      },
      { merge: true }
    );
    tx.set(referrerUserRef, { bonusGenerationCredits: FieldValue.increment(rewardValue) }, { merge: true });
    tx.set(
      referralRef,
      {
        status: "rewarded",
        activatedAt: FieldValue.serverTimestamp(),
        rewardedAt: FieldValue.serverTimestamp(),
        rewardGrantedToReferrer: {
          type: "generation_credits",
          value: rewardValue,
          grantedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  });
}

/** Increments the denormalized playlist counter used for the Creator tier threshold. */
export async function recordPlaylistGenerated(uid: string): Promise<void> {
  const db = getAdminDb();
  const profileRef = db.collection("referralProfiles").doc(uid);
  const snap = await profileRef.get();
  if (!snap.exists) return;
  const profile = snap.data() as UserReferralProfile;
  const nextTier = computeEligibleTier({
    ...profile,
    playlistsGenerated: profile.playlistsGenerated + 1,
  });
  await profileRef.set(
    {
      playlistsGenerated: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      ...tierUpdateFields(profile, nextTier),
    },
    { merge: true }
  );
}

/** Increments the share counter (Web Share / copy-link success) used for the Creator tier shortcut. */
export async function recordShare(uid: string): Promise<void> {
  const db = getAdminDb();
  const profileRef = db.collection("referralProfiles").doc(uid);
  const snap = await profileRef.get();
  if (!snap.exists) return;
  const profile = snap.data() as UserReferralProfile;
  const nextTier = computeEligibleTier({
    ...profile,
    sharesCount: profile.sharesCount + 1,
  });
  await profileRef.set(
    {
      totalReferralsSent: FieldValue.increment(0), // no-op, kept for schema symmetry
      sharesCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      ...tierUpdateFields(profile, nextTier),
    },
    { merge: true }
  );
}

// ── Friends leaderboard (computed live — no scheduled job for this MVP) ─────

export async function getFriendsLeaderboard(uid: string): Promise<FriendsLeaderboardEntryDTO[]> {
  const db = getAdminDb();
  const myProfileSnap = await db.collection("referralProfiles").doc(uid).get();
  if (!myProfileSnap.exists) return [];
  const myProfile = myProfileSnap.data() as UserReferralProfile;

  const uids = new Set<string>([uid]);
  if (myProfile.referredByUid) uids.add(myProfile.referredByUid);

  const referredByMe = await db.collection("referrals").where("referrerUid", "==", uid).get();
  referredByMe.docs.forEach((d) => uids.add((d.data() as Referral).refereeUid));

  const uidList = Array.from(uids);
  const [profileSnaps, userSnaps] = await Promise.all([
    Promise.all(uidList.map((u) => db.collection("referralProfiles").doc(u).get())),
    Promise.all(uidList.map((u) => db.collection("users").doc(u).get())),
  ]);
  const nameByUid = new Map(
    userSnaps.map((s) => [s.id, (s.data()?.displayName as string | undefined) || "Mood DJ user"])
  );

  return profileSnaps
    .filter((s) => s.exists)
    .map((s) => {
      const p = s.data() as UserReferralProfile;
      return {
        uid: p.uid,
        displayName: nameByUid.get(p.uid) ?? "Mood DJ user",
        tier: p.tier,
        totalReferralsActivated: p.totalReferralsActivated,
        playlistsGenerated: p.playlistsGenerated,
        isYou: p.uid === uid,
      };
    })
    .sort(
      (a, b) =>
        b.totalReferralsActivated - a.totalReferralsActivated ||
        b.playlistsGenerated - a.playlistsGenerated
    );
}

// ── Serialization (Timestamp -> ISO string for JSON responses) ──────────────

export function serializeProfile(p: UserReferralProfile): UserReferralProfileDTO {
  const toIso = (t: Timestamp | null) => (t ? t.toDate().toISOString() : null);
  return {
    ...p,
    tierAchievedAt: {
      explorer: toIso(p.tierAchievedAt.explorer),
      creator: toIso(p.tierAchievedAt.creator),
      ambassador: toIso(p.tierAchievedAt.ambassador),
    },
    createdAt: p.createdAt.toDate().toISOString(),
    updatedAt: p.updatedAt.toDate().toISOString(),
  };
}
