"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ShareSheetProps = {
  url: string;
  title?: string;
  text?: string;
  label: string;
  copiedLabel: string;
  /** Called once after a genuine share/copy success (not on cancel) — used to track sharesCount. */
  onShared?: () => void;
  className?: string;
};

/**
 * Reusable share button: native Web Share API first (mobile/PWA), falling
 * back to clipboard copy everywhere else. No native SDK dependency — this
 * is a 100% web product.
 */
export default function ShareSheet({
  url,
  title,
  text,
  label,
  copiedLabel,
  onShared,
  className,
}: ShareSheetProps) {
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        onShared?.();
        return;
      } catch {
        // User cancelled the share sheet, or the browser rejected it — fall
        // through to the copy fallback rather than treating it as success.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      onShared?.();
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard unavailable — nothing more we can do here */
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleShare}
      className={cn(
        "spotify-glow inline-flex items-center justify-center gap-2 rounded-full bg-spotify px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? "done" : "share"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className="flex items-center gap-2"
        >
          {done ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {done ? copiedLabel : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
