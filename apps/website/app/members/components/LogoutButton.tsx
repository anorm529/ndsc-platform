"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function logout() {
    setLoading(true);
    await fetch("/api/members/auth/logout", { method: "POST" });
    router.push("/members");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
    >
      <LogOut size={16} />
      {loading ? "Signing out" : "Sign out"}
    </button>
  );
}
