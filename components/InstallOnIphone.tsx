"use client";

/** Discreet footer block explaining how to add Mood DJ to an iPhone home screen. */
export default function InstallOnIphone() {
  return (
    <div className="safe-bottom mt-16 flex justify-center">
      <div className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M12 3v12m0-12L8 7m4-4l4 4"
            stroke="#1ED760"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 13v5a3 3 0 003 3h8a3 3 0 003-3v-5"
            stroke="#A7A7A7"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span>
          On iPhone: open this page in Safari, tap{" "}
          <span className="text-soft">Share</span>, then{" "}
          <span className="text-soft">Add to Home Screen</span>.
        </span>
      </div>
    </div>
  );
}
