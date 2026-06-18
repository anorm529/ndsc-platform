"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";

export function TopHeader({
  title,
  onMenuClick,
  userName,
  notificationCount,
}: {
  title: string;
  onMenuClick: () => void;
  userName: string;
  notificationCount: number;
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[rgba(4,12,23,0.82)] backdrop-blur-xl">
      <div className="flex h-[5.5rem] items-center justify-between gap-4 px-4 sm:px-6 lg:h-24 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="admin-panel-soft flex h-11 w-11 items-center justify-center rounded-2xl text-[#b6c0cd] hover:text-white lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.2rem]">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/members/admin/uploads"
            className="admin-panel-soft relative flex h-11 w-11 items-center justify-center rounded-full text-[#b4becb] hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-xs font-semibold text-[#03111d]">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            ) : null}
          </Link>

          <div className="flex h-[3.3rem] min-w-[3.3rem] items-center justify-center rounded-full bg-[rgba(5,88,92,0.74)] px-3 text-[1.1rem] font-medium tracking-[-0.04em] text-[color:var(--accent)]">
            {initials || "AD"}
          </div>
        </div>
      </div>
    </header>
  );
}
