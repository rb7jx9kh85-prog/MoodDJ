"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ChevronDown, ListMusic, Globe2, Flame } from "lucide-react";
import type { GenerationOptions } from "@/types";
import { MIN_TRACK_COUNT, MAX_TRACK_COUNT, SONG_LANGUAGES } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

// Language names shown in their own language — universal, no translation needed.
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  it: "Italiano",
};

function energyEmoji(energy: number): string {
  if (energy < 25) return "🧘";
  if (energy < 50) return "🌊";
  if (energy < 75) return "🕺";
  return "🔥";
}

type GenerationOptionsPanelProps = {
  value: GenerationOptions;
  onChange: (value: GenerationOptions) => void;
  disabled?: boolean;
};

export default function GenerationOptionsPanel({
  value,
  onChange,
  disabled,
}: GenerationOptionsPanelProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const trackFill = ((value.trackCount - MIN_TRACK_COUNT) / (MAX_TRACK_COUNT - MIN_TRACK_COUNT)) * 100;
  const languageLabel =
    value.language === "auto" ? t.app.options.auto : LANGUAGE_LABELS[value.language] ?? value.language;

  return (
    <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      {/* Toggle header with a live summary of the current settings */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-soft">
          <SlidersHorizontal className="size-4 text-spotify-bright" />
          {t.app.options.title}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="hidden sm:block">
            {value.trackCount} · {languageLabel} · {value.energy}% {energyEmoji(value.energy)}
          </span>
          <ChevronDown
            className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-white/10 p-5">
              {/* Track count */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-soft">
                    <ListMusic className="size-4 text-spotify-bright" />
                    {t.app.options.trackCount}
                  </label>
                  <span className="rounded-full bg-spotify/15 px-3 py-1 text-sm font-bold tabular-nums text-spotify-bright">
                    {value.trackCount}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_TRACK_COUNT}
                  max={MAX_TRACK_COUNT}
                  step={1}
                  value={value.trackCount}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, trackCount: Number(e.target.value) })}
                  className="mood-slider"
                  style={{ "--fill": `${trackFill}%` } as React.CSSProperties}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted/70">
                  <span>{MIN_TRACK_COUNT}</span>
                  <span>{MAX_TRACK_COUNT}</span>
                </div>
              </div>

              {/* Song language */}
              <div>
                <label className="mb-3 flex items-center gap-2 text-sm text-soft">
                  <Globe2 className="size-4 text-spotify-bright" />
                  {t.app.options.language}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SONG_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange({ ...value, language: lang })}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                        value.language === lang
                          ? "border-spotify bg-spotify/15 text-spotify-bright shadow-[0_0_14px_rgba(30,215,96,0.25)]"
                          : "border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-soft"
                      )}
                    >
                      {lang === "auto" ? `✨ ${t.app.options.auto}` : LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-soft">
                    <Flame className="size-4 text-spotify-bright" />
                    {t.app.options.energy}
                  </label>
                  <span className="rounded-full bg-spotify/15 px-3 py-1 text-sm font-bold tabular-nums text-spotify-bright">
                    {energyEmoji(value.energy)} {value.energy}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value.energy}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, energy: Number(e.target.value) })}
                  className="mood-slider"
                  style={{ "--fill": `${value.energy}%` } as React.CSSProperties}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted/70">
                  <span>🧘 {t.app.options.chill}</span>
                  <span>{t.app.options.intense} 🔥</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
