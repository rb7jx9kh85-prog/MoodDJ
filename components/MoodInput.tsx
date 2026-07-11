"use client";

import { motion } from "framer-motion";
import { MAX_PROMPT_LENGTH } from "@/lib/utils";
import { fadeUp } from "@/lib/animations";

const EXAMPLES = [
  "Driving at night under the rain",
  "Golden hour on a summer road trip",
  "Focused coding session at 2 AM",
  "Luxury hotel lobby in Tokyo",
  "Heartbreak but I'm still elegant",
  "Training hard before a race",
  "Walking alone in a neon city",
];

type MoodInputProps = {
  value: string;
  onChange: (value: string) => void;
  onGenerate: (pushToSpotify: boolean) => void;
  onConnect: () => void;
  loading: boolean;
  connected: boolean;
};

export default function MoodInput({
  value,
  onChange,
  onGenerate,
  onConnect,
  loading,
  connected,
}: MoodInputProps) {
  const remaining = MAX_PROMPT_LENGTH - value.length;
  const canGenerate = value.trim().length > 0 && !loading;

  return (
    <motion.div variants={fadeUp} className="w-full">
      <div className="glass-card pulse-input rounded-4xl p-2.5 sm:p-3">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) {
              e.preventDefault();
              onGenerate(connected);
            }
          }}
          placeholder="Describe a vibe… e.g. driving alone at night under the rain, melancholic but classy"
          rows={3}
          maxLength={MAX_PROMPT_LENGTH}
          className="w-full resize-none rounded-3xl bg-transparent px-4 py-3 text-base text-soft placeholder:text-muted/60 focus:outline-none sm:text-lg"
        />

        <div className="flex flex-col gap-3 px-3 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted/70">{remaining} characters left</span>

          <div className="flex flex-col gap-2 sm:flex-row">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onGenerate(false)}
              disabled={!canGenerate}
              className="hover-lift inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-soft transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate playlist"}
            </motion.button>

            {connected ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onGenerate(true)}
                disabled={!canGenerate}
                className="spotify-glow inline-flex items-center gap-2 rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SpotifyGlyph />
                Generate &amp; push to Spotify
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onConnect}
                className="spotify-glow inline-flex items-center gap-2 rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
              >
                <SpotifyGlyph />
                Connect to push to Spotify
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-sm text-muted">
        {connected
          ? "Generate a preview, or push it straight to your Spotify account."
          : "You can generate a preview without connecting — Spotify is only needed to push the playlist."}
      </p>

      {/* Example vibes */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => onChange(example)}
            disabled={loading}
            className="hover-lift rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted transition-colors hover:text-soft disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function SpotifyGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.1 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.32-1.32 11.4-1.02 15.84 1.62.54.3.72 1.02.42 1.56-.3.48-1.02.66-1.56.36z" />
    </svg>
  );
}
