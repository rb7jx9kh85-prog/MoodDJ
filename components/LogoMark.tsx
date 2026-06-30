"use client";

import { useId } from "react";

type LogoMarkProps = {
  size?: number;
  className?: string;
  /** Show the broken outer ring (default) or a solid disc-free mark. */
  ring?: boolean;
};

/**
 * Clean, flat vector version of the Mood DJ mark: a broken green ring framing
 * an equalizer waveform and a single music note. No 3D bevels or gloss — just
 * crisp geometry that scales from a 32px favicon to a hero logo.
 */
export default function LogoMark({ size = 64, className, ring = true }: LogoMarkProps) {
  const id = useId().replace(/:/g, "");
  const gradId = `mdj-grad-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Mood DJ"
    >
      <defs>
        <linearGradient id={gradId} x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1ED760" />
          <stop offset="1" stopColor="#1DB954" />
        </linearGradient>
      </defs>

      {ring && (
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={`url(#${gradId})`}
          strokeWidth="3"
          strokeLinecap="round"
          // Broken ring: ~83% drawn, rotated so the gap sits lower-left.
          strokeDasharray="146 30"
          transform="rotate(125 32 32)"
        />
      )}

      {/* Equalizer bars (left of centre) */}
      <g fill={`url(#${gradId})`}>
        <rect x="17" y="26.5" width="3.2" height="11" rx="1.6" />
        <rect x="23" y="21" width="3.2" height="22" rx="1.6" />
        <rect x="29" y="24.5" width="3.2" height="15" rx="1.6" />
      </g>

      {/* Music note (right of centre) */}
      <g fill={`url(#${gradId})`}>
        <rect x="40.4" y="18" width="3.1" height="22.5" rx="1.55" />
        <path d="M43.5 18.4c4.6 1 7.4 4 7.4 7.8 0 1.7-.5 3-1.3 4 .3-.8.4-1.6.4-2.4 0-3.3-2.6-5.6-6.5-6.4z" />
        <ellipse cx="38.4" cy="41.6" rx="6.1" ry="4.7" transform="rotate(-20 38.4 41.6)" />
      </g>
    </svg>
  );
}
