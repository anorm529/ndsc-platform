"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    const response = await fetch("/api/members/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not change password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password changed.");
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">New password</span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="rounded-xl border border-teal-300/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-400">{message}</div> : null}
      <button
        disabled={loading}
        className="rounded-xl bg-teal-300 px-5 py-3 text-sm font-semibold text-[#0F172A] disabled:opacity-60"
      >
        {loading ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
