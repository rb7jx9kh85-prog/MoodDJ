"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALES, type Locale, type Dictionary } from "@/lib/i18n/types";
import { dictionaries } from "@/lib/i18n";

const STORAGE_KEY = "mood-dj-locale";
const DEFAULT_LOCALE: Locale = "en";

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function detectLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;
  const nav = window.navigator.language.slice(0, 2).toLowerCase();
  if (isLocale(nav)) return nav;
  return DEFAULT_LOCALE;
}

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server-safe default so first client render matches SSR HTML; a mount
  // effect swaps in the stored/browser locale right after (tiny flash,
  // no hydration mismatch).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
