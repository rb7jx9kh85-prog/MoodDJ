"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Background from "@/components/Background";
import LogoMark from "@/components/LogoMark";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { fadeUp, staggerContainer } from "@/lib/animations";
import FriendsLeaderboard from "@/components/referral/FriendsLeaderboard";
import type { FriendsLeaderboardEntryDTO } from "@/types/referral";

export default function FriendsLeaderboardPage() {
  const { t } = useLanguage();
  const { user } = useFirebaseUser();
  const [entries, setEntries] = useState<FriendsLeaderboardEntryDTO[] | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((idToken) => {
      fetch("/api/referral/leaderboard/friends", { headers: { Authorization: `Bearer ${idToken}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => setEntries(json?.entries ?? []))
        .catch(() => setEntries([]));
    });
  }, [user]);

  const tierLabels: Record<string, string> = {
    explorer: t.referral.tierExplorer,
    creator: t.referral.tierCreator,
    ambassador: t.referral.tierAmbassador,
  };

  return (
    <div className="relative min-h-dvh">
      <Background />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/parrainage"
            className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-soft"
          >
            <ArrowLeft className="size-4" />
            {t.referral.back}
          </Link>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-sm font-semibold tracking-tight text-soft">Mood DJ</span>
          </Link>
        </div>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 variants={fadeUp} className="text-3xl font-semibold text-soft">
            {t.referral.leaderboardTitle}
          </motion.h1>

          <motion.div variants={fadeUp} className="glass-card mt-8 rounded-4xl p-6 sm:p-8">
            {entries === null ? (
              <p className="py-8 text-center text-sm text-muted">…</p>
            ) : (
              <FriendsLeaderboard
                entries={entries}
                tierLabels={tierLabels}
                colReferrals={t.referral.colReferrals}
                colPlaylists={t.referral.colPlaylists}
                youLabel={t.referral.you}
                emptyLabel={t.referral.leaderboardEmpty}
              />
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
