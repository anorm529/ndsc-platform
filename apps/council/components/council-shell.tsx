"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { CouncilSidebar } from "@/components/council-sidebar";

const titleMap: Record<string, string> = {
  "/council/dashboard":           "Dashboard",
  "/council/members":             "Members",
  "/council/seasons":             "Season Management",
  "/council/seasons/new":         "New Season",
  "/council/meetings":            "Meetings",
  "/council/meetings/new":        "New Meeting",
  "/council/actions":             "Action Tracker",
  "/council/actions/new":         "New Action",
  "/council/treasurer/accounts":  "Club Accounts",
  "/council/treasurer/fees":      "Player Fees",
  "/council/signups":             "Tournament Signups",
  "/council/captains":            "Captains & Rosters",
  "/council/fixtures":            "Fixtures & Results",
  "/council/stats":               "Game Stats Upload",
  "/council/standings":           "League Standings",
  "/council/awards":              "Awards",
  "/council/audit":               "Audit Log",
  "/council/archive":             "Season Archives",
  "/council/archive/stats":       "Membership Stats",
};

function getTitle(pathname: string): string {
  if (titleMap[pathname]) return titleMap[pathname];
  if (pathname.startsWith("/council/seasons/new")) return "New Season";
  if (pathname.match(/^\/council\/seasons\/[^/]+\/enroll/)) return "Enroll Players";
  if (pathname.match(/^\/council\/seasons\/[^/]+/)) return "Season Detail";
  if (pathname.startsWith("/council/meetings/")) return "Meeting";
  if (pathname.startsWith("/council/treasurer/accounts/")) return "Account Detail";
  if (pathname.startsWith("/council/treasurer/fees/")) return "Season Fees";
  if (pathname.match(/^\/council\/archive\/\d{4}$/)) return "Season Archive";
  return "Council";
}

export function CouncilShell({
  children,
  userName,
  councilPermissions,
  isOwner,
}: {
  children: ReactNode;
  userName: string;
  councilPermissions: string[];
  isOwner: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="council-grid-bg min-h-screen text-[color:var(--foreground)]">
      <CouncilSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={userName}
        councilPermissions={councilPermissions}
        isOwner={isOwner}
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-white/90 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-[1rem] font-semibold text-slate-800">
              {title}
            </h1>
          </div>
        </header>

        <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
