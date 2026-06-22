import Image from "next/image";
import Link from "next/link";
import type { AuthenticatedUser } from "@/lib/auth";
import LogoutButton from "@/app/members/components/LogoutButton";
import MembersNavLinks from "@/app/members/components/MembersNavLinks";

export default function MembersNav({ user }: { user: AuthenticatedUser }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2B4162] bg-[#0A1628]/95 backdrop-blur relative">
      {/* Logo in the left margin — only visible when viewport is wide enough to have space */}
      <Link
        href="/members/home"
        className="absolute left-3 top-1/2 -translate-y-1/2 hidden 2xl:block"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src="/members-logo.png"
          alt="NDSC Members Stats"
          width={80}
          height={80}
          className="h-20 w-20 object-contain"
          priority
        />
      </Link>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Top row: branding + user info + sign out */}
        <div className="flex items-center justify-between gap-4 py-3">
          <Link href="/members/home" className="flex items-center gap-3">
            <div>
              <div className="font-semibold tracking-wide text-white leading-tight">NDSC Members</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{user.role}</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm hidden sm:block">
              <div className="font-semibold text-white leading-tight">{user.playerName}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Bottom row: nav links */}
        <div className="border-t border-teal-800/50 pb-2.5 pt-2">
          <MembersNavLinks />
        </div>
      </div>
    </header>
  );
}
