"use client";

type EqualizerBarsProps = {
  bars?: number;
  className?: string;
  barClassName?: string;
};

/**
 * Pure-CSS animated equalizer. Heights/delays are derived from the bar index
 * (not Math.random) so the server and client render identical markup.
 */
export default function EqualizerBars({
  bars = 28,
  className,
  barClassName,
}: EqualizerBarsProps) {
  return (
    <div aria-hidden className={`flex items-end justify-center gap-[3px] ${className ?? ""}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`eq-bar rounded-full bg-gradient-to-t from-spotify to-spotify-bright ${
            barClassName ?? "w-1"
          }`}
          style={{
            height: `${22 + ((i * 37) % 62)}%`,
            animationDelay: `${(i % 9) * 0.11}s`,
            animationDuration: `${0.85 + (i % 5) * 0.17}s`,
          }}
        />
      ))}
    </div>
  );
}
