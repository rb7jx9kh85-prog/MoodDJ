"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import LogoMark from "@/components/LogoMark";

const links = [
  { name: "Fonctionnalités", href: "#benefits" },
  { name: "Aperçu", href: "#preview" },
  { name: "Tarifs", href: "/pricing" },
  { name: "Avis", href: "#testimonials" },
];

export default function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

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

        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {links.map((l) => (
            <Link key={l.name} href={l.href} className="transition-colors hover:text-soft">
              {l.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-soft transition-colors hover:text-spotify-bright sm:block"
          >
            Se connecter
          </Link>
          <Link
            href="/login"
            className="spotify-glow rounded-full bg-spotify px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-105 hover:bg-spotify-bright"
          >
            Essayer gratuitement
          </Link>
        </div>
      </div>
    </header>
  );
}
