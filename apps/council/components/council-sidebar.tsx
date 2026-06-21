"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

const ELEVATED_ROLES = new Set(["chairman", "vice_chair"]);
import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Shield,
  LogOut,
  X,
  PoundSterling,
  Trophy,
  BarChart2,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string | null;
};

const mainNav: NavItem[] = [
  { label: "Dashboard",  href: "/council/dashboard", icon: LayoutDashboard, permission: null },
  { label: "Members",    href: "/council/members",   icon: Users,            permission: null },
  { label: "Seasons",    href: "/council/seasons",   icon: Trophy,           permission: "chairman" },
  { label: "Captains",   href: "/council/captains",  icon: Shield,           permission: "captain" },
  { label: "Stats",      href: "/council/stats",     icon: BarChart2,        permission: "chairman" },
  { label: "Meetings",   href: "/council/meetings",  icon: CalendarDays,     permission: null },
  { label: "Actions",    href: "/council/actions",   icon: CheckSquare,      permission: null },
  { label: "Signups",    href: "/council/signups",   icon: ClipboardList,    permission: null },
];

const treasurerNav: NavItem[] = [
  { label: "Club Accounts", href: "/council/treasurer/accounts", icon: Wallet,        permission: "treasurer" },
  { label: "Player Fees",   href: "/council/treasurer/fees",     icon: PoundSterling, permission: "treasurer" },
];

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={[
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-colors",
        active
          ? "bg-teal-600/20 text-teal-400"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-4 w-4 shrink-0",
          active ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300",
        ].join(" ")}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function CouncilSidebar({
  mobileOpen,
  onClose,
  userName,
  councilPermissions,
  isOwner,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  userName: string;
  councilPermissions: string[];
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const permSet = new Set(councilPermissions);

  const isElevated = [...permSet].some((p) => ELEVATED_ROLES.has(p));

  const canSee = (item: NavItem) => {
    if (!item.permission) return true;
    if (isOwner || isElevated) return true;
    return permSet.has(item.permission);
  };

  const visibleMain = mainNav.filter(canSee);
  const visibleTreasurer = treasurerNav.filter(canSee);

  const isActive = (href: string) =>
    pathname === href || (href !== "/council/dashboard" && pathname.startsWith(href));

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-width)] flex-col border-r border-white/5 bg-slate-900",
        "transition-transform duration-200 ease-out lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-[105%]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/20 ring-1 ring-teal-500/30">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-teal-400" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.82rem] font-semibold text-white">NDSC Council</p>
            <p className="truncate text-[0.7rem] text-slate-500">{userName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden rounded-md p-1 text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleMain.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {visibleTreasurer.length > 0 ? (
          <>
            <div className="px-3 pt-5 pb-1.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-600">
                Treasurer
              </p>
            </div>
            {visibleTreasurer.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </>
        ) : null}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-2 py-3">
        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] text-slate-500 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
