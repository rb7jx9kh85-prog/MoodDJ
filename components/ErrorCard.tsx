"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type ErrorCardProps = {
  message: string;
  showConnect?: boolean;
  showLogin?: boolean;
  showUpgrade?: boolean;
  onRetry?: () => void;
  onConnect?: () => void;
};

export default function ErrorCard({
  message,
  showConnect,
  showLogin,
  showUpgrade,
  onRetry,
  onConnect,
}: ErrorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-4xl border-rose-500/20 p-6 text-center sm:p-8"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-300">
        !
      </div>
      <p className="mt-4 text-lg text-soft">{message}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {showConnect && onConnect && (
          <button
            onClick={onConnect}
            className="spotify-glow rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black hover:bg-spotify-bright"
          >
            Connect Spotify
          </button>
        )}
        {showLogin && (
          <Link
            href="/login"
            className="spotify-glow rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black hover:bg-spotify-bright"
          >
            Sign in
          </Link>
        )}
        {showUpgrade && (
          <Link
            href="/pricing"
            className="spotify-glow rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black hover:bg-spotify-bright"
          >
            See plans
          </Link>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="hover-lift rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-medium text-soft"
          >
            Try again
          </button>
        )}
      </div>
    </motion.div>
  );
}
