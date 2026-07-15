"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Background from "@/components/Background";
import LogoMark from "@/components/LogoMark";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { fadeUp, staggerContainer } from "@/lib/animations";
import ReferralDashboard from "@/components/referral/ReferralDashboard";

export default function ReferralPage() {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-dvh">
      <Background />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-soft">
            <ArrowLeft className="size-4" />
            {t.referral.back}
          </Link>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-sm font-semibold tracking-tight text-soft">Mood DJ</span>
          </Link>
        </div>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 variants={fadeUp} className="text-3xl font-semibold text-soft">
            {t.referral.title}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-2 text-sm text-muted">
            {t.referral.subtitle}
          </motion.p>

          <div className="mt-8">
            <ReferralDashboard />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
