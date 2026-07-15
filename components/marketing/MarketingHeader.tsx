"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import LogoMark from "@/components/LogoMark";
import Magnetic from "@/components/marketing/Magnetic";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function MarketingHeader() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const links = [
    { name: t.nav.features, href: "#benefits" },
    { name: t.nav.preview, href: "#preview" },
    { name: t.nav.pricing, href: "/pricing" },
    { name: t.nav.reviews, href: "#testimonials" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-30 px-4 pt-4">
      <div
        className={cn(
          "mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-transparent px-5 py-3 transition-all duration-300",
          scrolled && "glass-card border-white/10"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-base font-semibold tracking-tight text-soft">Mood DJ</span>
        </Link>

        <nav
          className="hidden items-center gap-7 text-sm text-muted md:flex"
          onMouseLeave={() => setHoveredLink(null)}
        >
          {links.map((l) => (
            <Link
              key={l.name}
              href={l.href}
              onMouseEnter={() => setHoveredLink(l.name)}
              className="relative py-1 transition-colors hover:text-soft"
            >
              {l.name}
              {hoveredLink === l.name && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-spotify to-spotify-bright"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSelector className="hidden sm:block" />
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-soft transition-colors hover:text-spotify-bright sm:block"
          >
            {t.nav.signIn}
          </Link>
          <Magnetic strength={10}>
            <Link
              href="/login"
              className="spotify-glow block rounded-full bg-spotify px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-spotify-bright"
            >
              {t.nav.tryFree}
            </Link>
          </Magnetic>
        </div>
      </div>
    </header>
  );
}
