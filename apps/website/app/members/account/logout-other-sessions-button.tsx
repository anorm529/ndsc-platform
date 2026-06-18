"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutOtherSessionsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    await fetch("/api/members/account/logout-other-sessions", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
    >
      {loading ? "Signing out devices..." : "Logout other devices"}
    </button>
  );
}
