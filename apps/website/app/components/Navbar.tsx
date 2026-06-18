"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LockKeyhole, Menu, Sparkles, Trophy, X } from "lucide-react";

const clubLinks = [
  { label: "About", href: "/#about" },
  { label: "Teams", href: "/#teams" },
  { label: "Training", href: "/#training" },
  { label: "Sponsors", href: "/#sponsors" },
  { label: "Facebook", href: "/#facebook" },
  { label: "Gallery", href: "/#gallery" },
];

const pageLinks = [
  { label: "League Standings", href: "/standings" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "News", href: "/news" },
];

const externalLinks = [
  {
    label: "Tournament Hub",
    href: "https://tournaments.northdownsoftballclub.co.uk",
    icon: Trophy,
    iconClass: "text-amber-400",
  },
  {
    label: "Fantasy League",
    href: "https://fantasy.northdownsoftballclub.co.uk/login",
    icon: Sparkles,
    iconClass: "text-violet-400",
  },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const clubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (clubRef.current && !clubRef.current.contains(e.target as Node)) {
        setClubOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setClubOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  function closeAll() {
    setMenuOpen(false);
    setClubOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B1324]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">

        {/* Logo */}
        <Link href="/#top" onClick={closeAll} className="shrink-0">
          <Image
            src="/logo.png"
            alt="North Down Softball Club Logo"
            width={180}
            height={180}
            className="h-16 w-auto rounded-xl object-contain brightness-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.12)] md:h-20"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">

          {/* Club dropdown */}
          <div ref={clubRef} className="relative">
            <button
              type="button"
              onClick={() => setClubOpen((v) => !v)}
              className="inline-flex items-center gap-1 transition hover:text-white"
              aria-expanded={clubOpen}
              aria-haspopup="true"
            >
              Club
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${clubOpen ? "rotate-180" : ""}`} />
            </button>

            {clubOpen && (
              <div className="absolute left-0 top-full z-50 mt-3 w-44 rounded-xl border border-white/10 bg-[#0B1324] py-1.5 shadow-xl">
                {clubLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeAll}
                    className="block px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Page links */}
          {pageLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* External platform buttons — desktop only */}
          {externalLinks.map(({ label, href, icon: Icon, iconClass }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white lg:inline-flex"
            >
              <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
              {label}
            </a>
          ))}

          {/* Members CTA */}
          <Link
            href="/members"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-[#0B1324] transition hover:bg-teal-300"
          >
            <LockKeyhole className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#0B1324] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-4">

            {/* Club section */}
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Club
            </div>
            {clubLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeAll}
                className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}

            {/* Pages section */}
            <div className="mt-2 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Pages
            </div>
            {pageLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeAll}
                className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            {/* Platforms section */}
            <div className="mt-2 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Platforms
            </div>
            {externalLinks.map(({ label, href, icon: Icon, iconClass }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeAll}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className={`h-4 w-4 ${iconClass}`} />
                {label}
              </a>
            ))}

            {/* Members CTA */}
            <div className="mt-3 border-t border-white/10 pt-3">
              <Link
                href="/members"
                onClick={closeAll}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-3 py-2.5 text-sm font-semibold text-[#0B1324] transition hover:bg-teal-300"
              >
                <LockKeyhole className="h-4 w-4" />
                Members Area
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
