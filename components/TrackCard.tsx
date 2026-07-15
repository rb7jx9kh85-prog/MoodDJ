"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Track } from "@/types";
import { fadeUp } from "@/lib/animations";

/** A single track row with album art, title, artist and a Spotify link. */
export default function TrackCard({ track, index }: { track: Track; index: number }) {
  return (
    <motion.a
      variants={fadeUp}
      href={track.spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      className="hover-lift group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
    >
      <span className="w-5 shrink-0 text-center text-sm tabular-nums text-muted/60">
        {index + 1}
      </span>

      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {track.image ? (
          <Image
            src={track.image}
            alt={track.album || track.name}
            fill
            sizes="48px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted">♪</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-soft">{track.name}</p>
        <p className="truncate text-sm text-muted">{track.artist}</p>
      </div>

      <span className="hidden shrink-0 text-spotify-bright opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.1 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.32-1.32 11.4-1.02 15.84 1.62.54.3.72 1.02.42 1.56-.3.48-1.02.66-1.56.36z" />
        </svg>
      </span>
    </motion.a>
  );
}
