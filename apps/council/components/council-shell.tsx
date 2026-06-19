"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { CouncilSidebar } from "@/components/council-sidebar";

const titleMap: Record<string, string> = {
  "/council/dashboard":           "Dashboard",
  "/council/members":             "Members",
  "/council/meetings":            "Meetings",
  "/council/meetings/new":        "New Meeting",
  "/council/actions":             "Action Tracker",
  "/council/actions/new":         "New Action",
  "/council/treasurer/accounts":  "Club Accounts",
  "/council/treasurer/fees":      "Player Fees",
};

function getTitle(pathname: string): string {
  if (titleMap[pathname]) return titleMap[pathname];
  if (pathname.startsWith("/council/meetings/")) return "Meeting";
  if (pathname.startsWith("/council/treasurer/accounts/")) return "Account Detail";
  if (pathname.startsWith("/council/treasurer/fees/")) return "Season Fees";
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
    <div className="council-grid-bg min-h-screen text-white">
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
          className="fixed inset-0 z-30 bg-[#020913]/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[rgba(3,11,21,0.85)] px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 text-[#7a8494] hover:bg-[rgba(255,255,255,0.05)] hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-white">
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
