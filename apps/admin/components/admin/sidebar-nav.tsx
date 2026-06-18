"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  Gauge,
  History,
  LogOut,
  MailCheck,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const adminMenu: NavItem[] = [
  { label: "Overview", href: "/admin/overview", icon: Gauge },
  { label: "Approvals", href: "/admin/approvals", icon: CheckCircle2 },
  { label: "Flags", href: "/admin/flags", icon: AlertTriangle },
  { label: "Member Accounts", href: "/admin/accounts", icon: ShieldCheck },
  { label: "Audit Log", href: "/admin/audit", icon: History },
  { label: "Email Delivery", href: "/admin/email", icon: MailCheck },
  { label: "Cleanup", href: "/admin/cleanup", icon: Trash2 },
  { label: "Security", href: "/admin/security", icon: ShieldCheck },
  { label: "Neon Database", href: "/members/admin/database", icon: Database },
  { label: "Neon Uploads", href: "/members/admin/uploads", icon: FileUp },
  { label: "Barracudas", href: "/admin/barracudas", icon: Users },
];

function SidebarLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={[
        "group flex items-center gap-4 rounded-full px-5 py-4 text-[1.05rem] font-medium tracking-[-0.02em]",
        active
          ? "bg-[linear-gradient(90deg,rgba(10,76,78,0.72),rgba(5,54,53,0.62))] text-[color:var(--accent)] shadow-[0_0_0_1px_rgba(29,215,207,0.08),0_12px_28px_rgba(3,62,63,0.22)]"
          : "text-[#9ca6b6] hover:bg-[rgba(11,26,43,0.65)] hover:text-white",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-5 w-5 shrink-0",
          active ? "text-[color:var(--accent)]" : "text-[#a4adbb] group-hover:text-white",
        ].join(" ")}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function SidebarNav({
  mobileOpen,
  onClose,
  userName,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "admin-panel fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-width)] flex-col rounded-r-[2rem] border-l-0 border-t-0 border-b-0 bg-[rgba(2,10,20,0.96)]",
        "transition-transform duration-200 ease-out lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-[105%]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full">
            <Image
              src="/logo.png"
              alt="NDSC logo"
              width={56}
              height={56}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[1.05rem] font-semibold text-white"
              title={userName}
            >
              {userName}
            </p>
            <p className="text-base text-[color:var(--muted-foreground)]">
              Control Panel
            </p>
          </div>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-[#8d97a7] hover:bg-[rgba(13,30,46,0.8)] hover:text-white lg:hidden"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="admin-scrollbar flex-1 overflow-y-auto px-3 py-6">
        <p className="px-4 text-sm font-semibold tracking-[0.16em] text-[#8b95a5]">
          ADMIN
        </p>
        <nav className="mt-4 space-y-2">
          {adminMenu.map((item) => (
            <SidebarLink
              key={item.label}
              item={item}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>
      </div>

      <div className="border-t border-[color:var(--border)] p-3">
        <form action="/admin/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-4 rounded-full px-5 py-4 text-[1.05rem] font-medium tracking-[-0.02em] text-[#b9c2cf] hover:bg-[rgba(11,26,43,0.65)] hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
