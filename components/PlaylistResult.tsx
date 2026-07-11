"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { GeneratedPlaylistResponse } from "@/types";
import { blurReveal, staggerContainer } from "@/lib/animations";
import TrackCard from "./TrackCard";
import PlaylistCover from "./PlaylistCover";

type PlaylistResultProps = {
  data: GeneratedPlaylistResponse;
  connected: boolean;
  pushing: boolean;
  onPush: () => void;
  onConnect: () => void;
  onReset: () => void;
};

export default function PlaylistResult({
  data,
  connected,
  pushing,
  onPush,
  onConnect,
  onReset,
}: PlaylistResultProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!data.spotifyPlaylistUrl) return;
    try {
      await navigator.clipboard.writeText(data.spotifyPlaylistUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <motion.div
      variants={blurReveal}
      initial="hidden"
      animate="visible"
      className="glass-card rounded-4xl p-5 sm:p-7"
    >
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Cover + meta */}
        <div>
          <PlaylistCover name={data.playlistName} vibe={data.vibe} />
        </div>

        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-soft sm:text-3xl">{data.playlistName}</h2>
          <p className="mt-2 text-muted">{data.playlistDescription}</p>

          {/* Genre chips */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mt-4 flex flex-wrap gap-2"
          >
            {data.genres.map((g) => (
              <motion.span
                key={g}
                variants={blurReveal}
                className="rounded-full border border-spotify/30 bg-spotify/10 px-3 py-1 text-xs font-medium text-spotify-bright"
              >
                {g}
              </motion.span>
            ))}
          </motion.div>

          {/* Energy meter */}
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Energy</span>
              <span>{data.energy}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.energy}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-spotify to-spotify-bright"
              />
            </div>
          </div>

          {/* Story / transition logic */}
          <p className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm italic text-muted">
            {data.transitionLogic}
          </p>
        </div>
      </div>

      {/* Primary actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {data.pushedToSpotify && data.spotifyPlaylistUrl ? (
          <>
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={data.spotifyPlaylistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="spotify-glow flex flex-1 items-center justify-center gap-2 rounded-full bg-spotify px-6 py-4 text-base font-semibold text-black transition-colors hover:bg-spotify-bright"
            >
              <SpotifyGlyph />
              Open playlist on Spotify
            </motion.a>

            <button
              onClick={copyLink}
              className="hover-lift rounded-full border border-white/12 bg-white/5 px-6 py-4 text-sm font-medium text-soft"
            >
              {copied ? "Link copied ✓" : "Copy Spotify link"}
            </button>
          </>
        ) : connected ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPush}
            disabled={pushing}
            className="spotify-glow flex flex-1 items-center justify-center gap-2 rounded-full bg-spotify px-6 py-4 text-base font-semibold text-black transition-colors hover:bg-spotify-bright disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SpotifyGlyph />
            {pushing ? "Pushing to Spotify…" : "Push this playlist to Spotify"}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConnect}
            className="spotify-glow flex flex-1 items-center justify-center gap-2 rounded-full bg-spotify px-6 py-4 text-base font-semibold text-black transition-colors hover:bg-spotify-bright"
          >
            <SpotifyGlyph />
            Connect Spotify to push this playlist
          </motion.button>
        )}

        <button
          onClick={onReset}
          className="hover-lift rounded-full border border-white/12 bg-white/5 px-6 py-4 text-sm font-medium text-soft"
        >
          Generate another vibe
        </button>
      </div>

      {!data.pushedToSpotify && (
        <p className="mt-3 text-center text-xs text-muted">
          This is a preview — nothing has been created on Spotify yet.
        </p>
      )}

      {/* Track list */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-6 space-y-2"
      >
        <p className="px-1 text-sm text-muted">{data.tracks.length} tracks</p>
        {data.tracks.map((track, i) => (
          <TrackCard key={`${track.id}-${i}`} track={track} index={i} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function SpotifyGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.1 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.32-1.32 11.4-1.02 15.84 1.62.54.3.72 1.02.42 1.56-.3.48-1.02.66-1.56.36z" />
    </svg>
  );
}
