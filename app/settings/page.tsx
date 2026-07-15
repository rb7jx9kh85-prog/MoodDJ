"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Gift, History } from "lucide-react";
import Background from "@/components/Background";
import LogoMark from "@/components/LogoMark";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/types";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { fadeUp, staggerContainer } from "@/lib/animations";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  flow: "Flow",
  flow_sync: "Flow Sync",
  lifetime: "Lifetime",
};

export default function SettingsPage() {
  const { t, locale, setLocale } = useLanguage();
  const { user } = useFirebaseUser();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((idToken) => {
      fetch("/api/me", { headers: { Authorization: `Bearer ${idToken}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setPlan(data?.plan ?? "free"))
        .catch(() => setPlan("free"));
    });
  }, [user]);

  return (
    <div className="relative min-h-screen">
      <Background />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-soft">
            <ArrowLeft className="size-4" />
            {t.settings.back}
          </Link>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-sm font-semibold tracking-tight text-soft">Mood DJ</span>
          </Link>
        </div>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 variants={fadeUp} className="text-3xl font-semibold text-soft">
            {t.settings.title}
          </motion.h1>

          <motion.section variants={fadeUp} className="glass-card mt-8 rounded-4xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-soft">{t.settings.language}</h2>
            <p className="mt-1 text-sm text-muted">{t.settings.languageDescription}</p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    l === locale
                      ? "border-spotify/50 bg-spotify/10 text-spotify-bright"
                      : "border-white/10 bg-white/5 text-soft hover:border-white/20"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{LOCALE_LABELS[l].flag}</span>
                    {LOCALE_LABELS[l].name}
                  </span>
                  {l === locale && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </motion.section>

          <motion.section variants={fadeUp} className="glass-card mt-6 rounded-4xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-soft">{t.settings.account}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-muted">Email</span>
                <span className="text-soft">{user?.email ?? t.settings.notSignedIn}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted">{t.settings.plan}</span>
                <span className="rounded-full bg-spotify/10 px-3 py-1 text-xs font-medium text-spotify-bright">
                  {user ? PLAN_LABELS[plan ?? "free"] : "—"}
                </span>
              </div>
            </div>
          </motion.section>

          <motion.section variants={fadeUp} className="glass-card mt-6 rounded-4xl p-6 sm:p-8">
            <div className="space-y-2">
              <Link
                href="/parrainage"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-soft transition-colors hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <Gift className="size-4 text-spotify-bright" />
                  {t.settings.referralLink}
                </span>
              </Link>
              <Link
                href="/historique"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-soft transition-colors hover:border-white/20"
              >
                <span className="flex items-center gap-2">
                  <History className="size-4 text-spotify-bright" />
                  {t.settings.historyLink}
                </span>
              </Link>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
