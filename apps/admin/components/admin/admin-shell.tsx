"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { TopHeader } from "@/components/admin/top-header";

const titleMap: Record<string, string> = {
  "/admin/overview": "Overview",
  "/admin/approvals": "Approval Queue",
  "/admin/flags": "Flags",
  "/admin/accounts": "Member Accounts",
  "/admin/audit": "Audit Log",
  "/admin/email": "Email Delivery",
  "/admin/cleanup": "Cleanup",
  "/admin/security": "Security",
  "/admin/barracudas": "Barracudas",
  "/members/admin": "Neon Database",
  "/members/admin/database": "Neon Database",
  "/members/admin/seasons": "Seasons",
  "/members/admin/teams": "NDSC Teams",
  "/members/admin/players": "Players",
  "/members/admin/calendar": "Calendar",
  "/members/admin/game-stats": "Player Game Stats",
  "/members/admin/uploads": "Uploads",
  "/members/admin/eos-stats": "EOS Stats",
  "/members/admin/league-standings": "League Standings",
  "/members/admin/awards": "Awards",
};

export function AdminShell({
  children,
  userName,
  notificationCount,
}: {
  children: ReactNode;
  userName: string;
  notificationCount: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const title = pathname.startsWith("/admin/accounts/")
    ? "Account Detail"
    : titleMap[pathname] || "Dashboard";

  return (
    <div className="admin-shell-bg admin-grid-bg min-h-screen text-white">
      <SidebarNav
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={userName}
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-[#020913]/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <TopHeader
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          userName={userName}
          notificationCount={notificationCount}
        />

        <main className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
