"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  ChevronDown,
  ListMusic,
  Globe2,
  Flame,
  RotateCcw,
} from "lucide-react";
import type { GenerationOptions, VocalPreference, EraPreference, PopularityPreference, DiscoveryLevel, PlaylistProgression } from "@/types";
import {
  MIN_TRACK_COUNT,
  MAX_TRACK_COUNT,
  SONG_LANGUAGES,
  DEFAULT_GENERATION_OPTIONS,
  VOCAL_PREFERENCES,
  ERA_PREFERENCES,
  POPULARITY_PREFERENCES,
  DISCOVERY_LEVELS,
  PLAYLIST_PROGRESSIONS,
  MAX_GENRE_TAGS,
  MAX_ARTIST_TAGS,
  MAX_REFERENCE_TRACKS,
  MAX_TAG_LENGTH,
  MAX_CUSTOM_INSTRUCTIONS_LENGTH,
  MAX_CONTEXT_FIELD_LENGTH,
  cn,
} from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { springSnappy } from "@/lib/animations";

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

/** A single 0-100 slider row with a fill matching the app's existing style. */
function Slider({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm text-soft">{label}</label>
        <motion.span
          key={value}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="rounded-full bg-spotify/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-spotify-bright"
        >
          {value}
        </motion.span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mood-slider"
        style={{ "--fill": `${value}%` } as React.CSSProperties}
      />
      {hint && <p className="mt-1 text-[11px] text-muted/70">{hint}</p>}
    </div>
  );
}

/** A row of selectable pills for a categorical setting. */
function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
  disabled,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-soft">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <motion.button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              value === opt
                ? "border-spotify bg-spotify/15 text-spotify-bright shadow-[0_0_14px_rgba(30,215,96,0.25)]"
                : "border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-soft"
            )}
          >
            {labels[opt]}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Free-text tag input (genres, artists, reference tracks) — type + Enter to add. */
function TagInput({
  label,
  value,
  onChange,
  placeholder,
  maxItems,
  disabled,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  maxItems: number;
  disabled?: boolean;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");
  const atLimit = value.length >= maxItems;

  const commit = () => {
    const clean = draft.trim();
    setDraft("");
    if (!clean || atLimit || value.includes(clean)) return;
    onChange([...value, clean]);
  };

  return (
    <div>
      <label className="mb-2 block text-sm text-soft">{label}</label>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-soft"
            >
              {tag}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="text-muted hover:text-soft"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_TAG_LENGTH))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={atLimit ? undefined : placeholder}
        disabled={disabled || atLimit}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-soft placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-spotify/40 disabled:opacity-50"
      />
      {hint && <p className="mt-1 text-[11px] text-muted/70">{hint}</p>}
    </div>
  );
}

/** On/off row for the deterministic technical toggles. */
function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-soft">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-spotify" : "bg-white/15"
        )}
      >
        <motion.span
          className="absolute top-0.5 block size-5 rounded-full bg-white"
          animate={{ x: checked ? 20 : 2 }}
          transition={springSnappy}
        />
      </button>
    </div>
  );
}

/** A single free-text field for the "Context" category. */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  maxLength: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-soft">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-soft placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-spotify/40 disabled:opacity-50"
      />
    </div>
  );
}

/** Collapsible category section shared by every advanced-settings group. */
function Category({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="text-sm font-medium text-soft">{title}</span>
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/10 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GenerationOptionsPanel({
  value,
  onChange,
  disabled,
}: GenerationOptionsPanelProps) {
  const { t } = useLanguage();
  const opt = t.app.options;
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const trackFill = ((value.trackCount - MIN_TRACK_COUNT) / (MAX_TRACK_COUNT - MIN_TRACK_COUNT)) * 100;
  const languageLabel =
    value.language === "auto" ? opt.auto : LANGUAGE_LABELS[value.language] ?? value.language;

  const patch = (partial: Partial<GenerationOptions>) => onChange({ ...value, ...partial });
  const toggleCategory = (key: string) => setOpenCategory((cur) => (cur === key ? null : key));

  const vocalLabels: Record<VocalPreference, string> = {
    any: opt.vocals.any,
    "mostly-vocal": opt.vocals.mostlyVocal,
    "mostly-instrumental": opt.vocals.mostlyInstrumental,
    "instrumental-only": opt.vocals.instrumentalOnly,
    "female-vocals": opt.vocals.female,
    "male-vocals": opt.vocals.male,
    "mixed-vocals": opt.vocals.mixed,
    duets: opt.vocals.duets,
    "spoken-word": opt.vocals.spokenWord,
    "whispered-breathy": opt.vocals.whisperedBreathy,
  };

  const eraLabels: Record<EraPreference, string> = {
    any: opt.style.eraAny,
    "1960s": "1960s",
    "1970s": "1970s",
    "1980s": "1980s",
    "1990s": "1990s",
    "2000s": "2000s",
    "2010s": "2010s",
    "2020s": "2020s",
    current: opt.style.eraCurrent,
  };

  const popularityLabels: Record<PopularityPreference, string> = {
    any: opt.style.popularityAny,
    mainstream: opt.style.popularityMainstream,
    balanced: opt.style.popularityBalanced,
    niche: opt.style.popularityNiche,
    underground: opt.style.popularityUnderground,
  };

  const discoveryLabels: Record<DiscoveryLevel, string> = {
    safe: opt.style.discoverySafe,
    balanced: opt.style.discoveryBalanced,
    adventurous: opt.style.discoveryAdventurous,
    underground: opt.style.discoveryUnderground,
  };

  const progressionLabels: Record<PlaylistProgression, string> = {
    stable: opt.progression.stable,
    "gradual-rise": opt.progression.gradualRise,
    "gradual-fall": opt.progression.gradualFall,
    wave: opt.progression.wave,
    "slow-burn": opt.progression.slowBurn,
    "peak-and-release": opt.progression.peakAndRelease,
    "cinematic-journey": opt.progression.cinematicJourney,
  };

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
          {opt.title}
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
                    {opt.trackCount}
                  </label>
                  <motion.span
                    key={value.trackCount}
                    initial={{ scale: 0.85, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="rounded-full bg-spotify/15 px-3 py-1 text-sm font-bold tabular-nums text-spotify-bright"
                  >
                    {value.trackCount}
                  </motion.span>
                </div>
                <input
                  type="range"
                  min={MIN_TRACK_COUNT}
                  max={MAX_TRACK_COUNT}
                  step={1}
                  value={value.trackCount}
                  disabled={disabled}
                  onChange={(e) => patch({ trackCount: Number(e.target.value) })}
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
                  {opt.language}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SONG_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      disabled={disabled}
                      onClick={() => patch({ language: lang })}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                        value.language === lang
                          ? "border-spotify bg-spotify/15 text-spotify-bright shadow-[0_0_14px_rgba(30,215,96,0.25)]"
                          : "border-white/10 bg-white/5 text-muted hover:border-white/25 hover:text-soft"
                      )}
                    >
                      {lang === "auto" ? `✨ ${opt.auto}` : LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-soft">
                    <Flame className="size-4 text-spotify-bright" />
                    {opt.energy}
                  </label>
                  <motion.span
                    key={value.energy}
                    initial={{ scale: 0.85, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="rounded-full bg-spotify/15 px-3 py-1 text-sm font-bold tabular-nums text-spotify-bright"
                  >
                    {energyEmoji(value.energy)} {value.energy}%
                  </motion.span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value.energy}
                  disabled={disabled}
                  onChange={(e) => patch({ energy: Number(e.target.value) })}
                  className="mood-slider"
                  style={{ "--fill": `${value.energy}%` } as React.CSSProperties}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted/70">
                  <span>🧘 {opt.chill}</span>
                  <span>{opt.intense} 🔥</span>
                </div>
              </div>

              {/* Advanced settings toggle */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    disabled={disabled}
                    className="flex items-center gap-2 text-sm font-medium text-spotify-bright hover:text-spotify disabled:opacity-50"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", advancedOpen && "rotate-180")}
                    />
                    {opt.advanced}
                  </button>
                  {advancedOpen && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...DEFAULT_GENERATION_OPTIONS, trackCount: value.trackCount, language: value.language })}
                      disabled={disabled}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-soft disabled:opacity-50"
                    >
                      <RotateCcw className="size-3.5" />
                      {opt.reset}
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {advancedOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-3">
                        {/* 1. Ambiance */}
                        <Category
                          title={opt.ambiance.title}
                          open={openCategory === "ambiance"}
                          onToggle={() => toggleCategory("ambiance")}
                        >
                          <Slider
                            label={opt.ambiance.danceability}
                            value={value.danceability}
                            onChange={(v) => patch({ danceability: v })}
                            disabled={disabled}
                          />
                          <Slider
                            label={opt.ambiance.emotionalIntensity}
                            value={value.emotionalIntensity}
                            onChange={(v) => patch({ emotionalIntensity: v })}
                            disabled={disabled}
                          />
                          <Slider
                            label={opt.ambiance.positivity}
                            value={value.positivity}
                            onChange={(v) => patch({ positivity: v })}
                            disabled={disabled}
                          />
                          <Slider
                            label={opt.ambiance.darkness}
                            value={value.darkness}
                            onChange={(v) => patch({ darkness: v })}
                            disabled={disabled}
                          />
                          <Slider
                            label={opt.ambiance.sensuality}
                            value={value.sensuality}
                            onChange={(v) => patch({ sensuality: v })}
                            disabled={disabled}
                          />
                        </Category>

                        {/* 2. Musical style */}
                        <Category
                          title={opt.style.title}
                          open={openCategory === "style"}
                          onToggle={() => toggleCategory("style")}
                        >
                          <TagInput
                            label={opt.style.preferredGenres}
                            value={value.preferredGenres}
                            onChange={(v) => patch({ preferredGenres: v })}
                            placeholder={opt.style.genrePlaceholder}
                            maxItems={MAX_GENRE_TAGS}
                            disabled={disabled}
                          />
                          <TagInput
                            label={opt.style.excludedGenres}
                            value={value.excludedGenres}
                            onChange={(v) => patch({ excludedGenres: v })}
                            placeholder={opt.style.genrePlaceholder}
                            maxItems={MAX_GENRE_TAGS}
                            disabled={disabled}
                          />
                          <PillGroup
                            label={opt.style.era}
                            options={ERA_PREFERENCES}
                            value={value.era}
                            onChange={(v) => patch({ era: v })}
                            labels={eraLabels}
                            disabled={disabled}
                          />
                          <PillGroup
                            label={opt.style.popularity}
                            options={POPULARITY_PREFERENCES}
                            value={value.popularity}
                            onChange={(v) => patch({ popularity: v })}
                            labels={popularityLabels}
                            disabled={disabled}
                          />
                          <PillGroup
                            label={opt.style.discovery}
                            options={DISCOVERY_LEVELS}
                            value={value.discoveryLevel}
                            onChange={(v) => patch({ discoveryLevel: v })}
                            labels={discoveryLabels}
                            disabled={disabled}
                          />
                          <Slider
                            label={opt.style.variety}
                            value={value.variety}
                            onChange={(v) => patch({ variety: v })}
                            disabled={disabled}
                          />
                        </Category>

                        {/* 3. Voice & lyrics */}
                        <Category
                          title={opt.vocals.title}
                          open={openCategory === "vocals"}
                          onToggle={() => toggleCategory("vocals")}
                        >
                          <PillGroup
                            label={opt.vocals.preference}
                            options={VOCAL_PREFERENCES}
                            value={value.vocalPreference}
                            onChange={(v) => patch({ vocalPreference: v })}
                            labels={vocalLabels}
                            disabled={disabled}
                          />
                          <Toggle
                            label={opt.vocals.explicit}
                            checked={value.includeExplicit}
                            onChange={(v) => patch({ includeExplicit: v })}
                            disabled={disabled}
                          />
                        </Category>

                        {/* 4. Track selection */}
                        <Category
                          title={opt.selection.title}
                          open={openCategory === "selection"}
                          onToggle={() => toggleCategory("selection")}
                        >
                          <TagInput
                            label={opt.selection.preferredArtists}
                            value={value.preferredArtists}
                            onChange={(v) => patch({ preferredArtists: v })}
                            placeholder={opt.selection.artistPlaceholder}
                            maxItems={MAX_ARTIST_TAGS}
                            disabled={disabled}
                          />
                          <TagInput
                            label={opt.selection.excludedArtists}
                            value={value.excludedArtists}
                            onChange={(v) => patch({ excludedArtists: v })}
                            placeholder={opt.selection.artistPlaceholder}
                            maxItems={MAX_ARTIST_TAGS}
                            disabled={disabled}
                          />
                          <TagInput
                            label={opt.selection.referenceTracks}
                            value={value.referenceTracks}
                            onChange={(v) => patch({ referenceTracks: v })}
                            placeholder={opt.selection.referenceTracksPlaceholder}
                            maxItems={MAX_REFERENCE_TRACKS}
                            disabled={disabled}
                            hint={opt.selection.referenceTracksHint}
                          />
                          <Toggle
                            label={opt.selection.remixes}
                            checked={value.allowRemixes}
                            onChange={(v) => patch({ allowRemixes: v })}
                            disabled={disabled}
                          />
                          <Toggle
                            label={opt.selection.liveVersions}
                            checked={value.allowLiveVersions}
                            onChange={(v) => patch({ allowLiveVersions: v })}
                            disabled={disabled}
                          />
                          <Toggle
                            label={opt.selection.covers}
                            checked={value.allowCovers}
                            onChange={(v) => patch({ allowCovers: v })}
                            disabled={disabled}
                          />
                        </Category>

                        {/* 5. Progression */}
                        <Category
                          title={opt.progression.title}
                          open={openCategory === "progression"}
                          onToggle={() => toggleCategory("progression")}
                        >
                          <PillGroup
                            label={opt.progression.title}
                            options={PLAYLIST_PROGRESSIONS}
                            value={value.progression}
                            onChange={(v) => patch({ progression: v })}
                            labels={progressionLabels}
                            disabled={disabled}
                          />
                        </Category>

                        {/* 6. Context */}
                        <Category
                          title={opt.context.title}
                          open={openCategory === "context"}
                          onToggle={() => toggleCategory("context")}
                        >
                          <TextField
                            label={opt.context.activity}
                            value={value.activity}
                            onChange={(v) => patch({ activity: v })}
                            placeholder={opt.context.activityPlaceholder}
                            disabled={disabled}
                            maxLength={MAX_CONTEXT_FIELD_LENGTH}
                          />
                          <TextField
                            label={opt.context.locationAtmosphere}
                            value={value.locationAtmosphere}
                            onChange={(v) => patch({ locationAtmosphere: v })}
                            placeholder={opt.context.locationPlaceholder}
                            disabled={disabled}
                            maxLength={MAX_CONTEXT_FIELD_LENGTH}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <TextField
                              label={opt.context.timeOfDay}
                              value={value.timeOfDay}
                              onChange={(v) => patch({ timeOfDay: v })}
                              placeholder=""
                              disabled={disabled}
                              maxLength={MAX_CONTEXT_FIELD_LENGTH}
                            />
                            <TextField
                              label={opt.context.season}
                              value={value.season}
                              onChange={(v) => patch({ season: v })}
                              placeholder=""
                              disabled={disabled}
                              maxLength={MAX_CONTEXT_FIELD_LENGTH}
                            />
                          </div>
                          <TextField
                            label={opt.context.customInstructions}
                            value={value.customInstructions}
                            onChange={(v) => patch({ customInstructions: v })}
                            placeholder={opt.context.customInstructionsPlaceholder}
                            disabled={disabled}
                            maxLength={MAX_CUSTOM_INSTRUCTIONS_LENGTH}
                          />
                        </Category>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
