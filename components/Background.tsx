"use client";

import FloatingOrbs from "./FloatingOrbs";

/** Full-screen ambient background: deep black, animated gradient, orbs, grid, noise. */
export default function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div className="absolute inset-0 animated-gradient" />
      <FloatingOrbs />
      <div className="absolute inset-0 grid-overlay" />
      <div className="absolute inset-0 noise-overlay" />
      {/* Vignette to keep edges deep */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
}
