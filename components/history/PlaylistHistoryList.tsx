"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { PlaylistHistoryEntryDTO } from "@/types/referral";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { staggerContainer, fadeUp } from "@/lib/animations";
import PlaylistCover from "@/components/PlaylistCover";

export default function PlaylistHistoryList() {
  const { t } = useLanguage();
  const { user, checked } = useFirebaseUser();
  const [playlists, setPlaylists] = useState<PlaylistHistoryEntryDTO[] | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((idToken) => {
      fetch("/api/playlists/history", { headers: { Authorization: `Bearer ${idToken}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => setPlaylists(json?.playlists ?? []))
        .catch(() => setPlaylists([]));
    });
  }, [user]);

  if (!checked || (user && playlists === null)) {
    return <div className="glass-card rounded-4xl p-8 text-center text-sm text-muted">…</div>;
  }

  if (!playlists || playlists.length === 0) {
    return (
      <div className="glass-card rounded-4xl p-10 text-center">
        <p className="text-sm text-muted">{t.history.empty}</p>
        <Link
          href="/app"
          className="spotify-glow mt-5 inline-flex rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
        >
          {t.history.emptyCta}
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2"
    >
      {playlists.map((p) => (
        <motion.div
          key={p.id}
          variants={fadeUp}
          className="glass-card flex gap-4 rounded-3xl p-4"
        >
          <div className="w-20 shrink-0">
            <PlaylistCover name={p.playlistName} vibe={p.vibe} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-soft">{p.playlistName}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{p.playlistDescription}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                {p.trackCount} {t.history.tracksSuffix}
              </span>
              <span
                className={
                  p.pushedToSpotify
                    ? "rounded-full border border-spotify/30 bg-spotify/10 px-2 py-0.5 text-spotify-bright"
                    : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5"
                }
              >
                {p.pushedToSpotify ? t.history.pushedBadge : t.history.previewBadge}
              </span>
            </div>
            {p.pushedToSpotify && p.spotifyPlaylistUrl && (
              <a
                href={p.spotifyPlaylistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-spotify-bright hover:underline"
              >
                Open on Spotify →
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
