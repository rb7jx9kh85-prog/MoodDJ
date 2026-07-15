"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, Mail } from "lucide-react";
import type { UserReferralProfileDTO } from "@/types/referral";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { resendEmailVerification } from "@/lib/firebase-auth";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { fadeUp, staggerContainer } from "@/lib/animations";
import ShareSheet from "./ShareSheet";
import TierBadge from "./TierBadge";
import TierProgressBar from "./TierProgressBar";

type MeResponse = {
  profile: UserReferralProfileDTO;
  tierProgress: { nextTier: string; currentValue: number; targetValue: number } | null;
};

export default function ReferralDashboard() {
  const { t } = useLanguage();
  const { user } = useFirebaseUser();
  const [data, setData] = useState<MeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((idToken) => {
      fetch("/api/referral/me", { headers: { Authorization: `Bearer ${idToken}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => json && setData(json))
        .catch(() => {});
    });
  }, [user]);

  const trackShare = () => {
    user?.getIdToken().then((idToken) => {
      fetch("/api/referral/track-share", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => {});
    });
  };

  const handleResend = async () => {
    if (!user) return;
    try {
      await resendEmailVerification(user);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      /* non-fatal */
    }
  };

  if (!data) {
    return (
      <div className="glass-card rounded-4xl p-8 text-center text-sm text-muted">…</div>
    );
  }

  const { profile, tierProgress } = data;
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/login?ref=${profile.referralCode}`
      : "";

  const tierLabels: Record<string, string> = {
    explorer: t.referral.tierExplorer,
    creator: t.referral.tierCreator,
    ambassador: t.referral.tierAmbassador,
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {user && !user.emailVerified && (
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4"
        >
          <div className="flex items-center gap-2 text-sm text-amber-200">
            <Mail className="size-4 shrink-0" />
            {t.referral.verifyEmailPrompt}
          </div>
          <button
            onClick={handleResend}
            className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/20"
          >
            {resent ? t.referral.verificationSent : t.referral.resendVerification}
          </button>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="glass-card rounded-4xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <TierBadge tier={profile.tier} label={tierLabels[profile.tier]} />
          <span className="text-2xl font-bold tabular-nums text-spotify-bright">
            {profile.creditsBalance}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{t.referral.creditsBalance}</p>

        <div className="mt-6">
          <p className="mb-2 text-sm text-soft">{t.referral.yourCode}</p>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <code className="flex-1 truncate text-sm font-semibold text-spotify-bright">
              {profile.referralCode}
            </code>
            <button
              onClick={copyCode}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-muted hover:text-soft"
              aria-label={t.referral.copyLink}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ShareSheet
            url={referralLink}
            title={t.referral.shareTitle}
            text={t.referral.shareMessage}
            label={t.referral.share}
            copiedLabel={t.referral.copied}
            onShared={trackShare}
            className="w-full"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-soft">{profile.totalReferralsSent}</p>
            <p className="mt-1 text-xs text-muted">{t.referral.sent}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-soft">
              {profile.totalReferralsActivated}
            </p>
            <p className="mt-1 text-xs text-muted">{t.referral.activated}</p>
          </div>
        </div>

        {tierProgress && (
          <div className="mt-6">
            <TierProgressBar
              currentValue={tierProgress.currentValue}
              targetValue={tierProgress.targetValue}
              label={`${t.referral.nextTier}: ${tierLabels[tierProgress.nextTier] ?? tierProgress.nextTier}`}
            />
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <Link
          href="/parrainage/classement"
          className="hover-lift block rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-soft transition-colors hover:text-spotify-bright"
        >
          {t.referral.viewLeaderboard}
        </Link>
      </motion.div>
    </motion.div>
  );
}
