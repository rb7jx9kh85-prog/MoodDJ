"use client";

import { motion } from "framer-motion";
import type { FriendsLeaderboardEntryDTO } from "@/types/referral";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import TierBadge from "./TierBadge";

type FriendsLeaderboardProps = {
  entries: FriendsLeaderboardEntryDTO[];
  tierLabels: Record<string, string>;
  colReferrals: string;
  colPlaylists: string;
  youLabel: string;
  emptyLabel: string;
};

export default function FriendsLeaderboard({
  entries,
  tierLabels,
  colReferrals,
  colPlaylists,
  youLabel,
  emptyLabel,
}: FriendsLeaderboardProps) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
      {entries.map((entry, i) => (
        <motion.div
          key={entry.uid}
          variants={fadeUp}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-3",
            entry.isYou
              ? "border-spotify/40 bg-spotify/10"
              : "border-white/5 bg-white/[0.03]"
          )}
        >
          <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-muted">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-soft">
              {entry.isYou ? youLabel : entry.displayName}
            </p>
          </div>
          <TierBadge tier={entry.tier} label={tierLabels[entry.tier] ?? entry.tier} />
          <div className="hidden shrink-0 items-center gap-4 text-xs text-muted sm:flex">
            <span className="tabular-nums">
              {entry.totalReferralsActivated} {colReferrals}
            </span>
            <span className="tabular-nums">
              {entry.playlistsGenerated} {colPlaylists}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
