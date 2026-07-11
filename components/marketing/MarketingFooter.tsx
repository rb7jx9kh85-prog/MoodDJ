"use client";

import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function MarketingFooter() {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-soft">Mood DJ</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="hover:text-soft">
            {t.footer.pricing}
          </Link>
          <Link href="/login" className="hover:text-soft">
            {t.footer.signIn}
          </Link>
        </div>
        <p>
          © {new Date().getFullYear()} {t.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
