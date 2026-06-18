"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const TEAM_SLUGS = ["buccaneers", "barracudas", "sluggers"] as const;

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TeamSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-xl border border-teal-700/60 bg-teal-900/30 px-3 py-2 text-sm font-semibold text-teal-300 transition hover:bg-teal-800/40 hover:text-teal-200"
        aria-expanded={open}
        aria-haspopup="true"
      >
        All Teams
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-[#2B4162] bg-[#1D2E48] py-1 shadow-xl">
          {TEAM_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/members/teams/${slug}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              {titleCase(slug)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
