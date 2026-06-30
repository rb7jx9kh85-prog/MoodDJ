"use client";

import LogoMark from "./LogoMark";

/** Deterministically pick a gradient from the vibe text so each cover feels unique. */
function gradientFor(seed: string): [string, string] {
  const palettes: Array<[string, string]> = [
    ["#0f2417", "#1DB954"],
    ["#10221f", "#0ea5e9"],
    ["#1a1030", "#8b5cf6"],
    ["#2a1418", "#f43f5e"],
    ["#231a0f", "#f59e0b"],
    ["#0f2230", "#22d3ee"],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

export default function PlaylistCover({
  name,
  vibe,
  className,
}: {
  name: string;
  vibe: string;
  className?: string;
}) {
  const [from, to] = gradientFor(vibe || name);

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-3xl ${className ?? ""}`}
      style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
    >
      <div className="absolute inset-0 bg-black/25" />
      {/* Mini equalizer "wave" along the bottom */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-1 p-4 opacity-70">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-t bg-white/70"
            style={{ height: `${20 + Math.abs(Math.sin(i * 1.3)) * 60}%` }}
          />
        ))}
      </div>

      <div className="absolute left-4 top-4">
        <LogoMark size={40} />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="line-clamp-2 text-2xl font-bold leading-tight text-white drop-shadow">
          {name}
        </p>
      </div>
    </div>
  );
}
