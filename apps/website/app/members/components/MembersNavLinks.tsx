"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/members/home", label: "Profile" },
  { href: "/members/my-team", label: "My Team" },
  { href: "/members/league-standings", label: "League Standings" },
  { href: "/members/this-week", label: "This Week" },
  { href: "/members/achievements", label: "Achievements" },
  { href: "/members/awards", label: "Awards" },
  { href: "/members/account", label: "Account" },
];

export default function MembersNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto themed-scrollbar">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "shrink-0 rounded-xl border border-teal-300/40 bg-teal-500/10 px-3 py-2 text-sm font-semibold text-teal-300"
                : "shrink-0 rounded-xl border border-[#2B4162] bg-slate-700/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
