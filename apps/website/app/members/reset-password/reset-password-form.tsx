"use client";

import { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    const response = await fetch("/api/members/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not reset password.");
      return;
    }

    setPassword("");
    setMessage("Password reset. You can sign in now.");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      {!token ? <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Missing reset token.</div> : null}
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">New password</span>
        <input
          value={password}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="rounded-xl border border-teal-300/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-400">{message}</div> : null}
      <button disabled={loading || !token} className="w-full rounded-xl bg-teal-300 px-4 py-3 font-semibold text-[#0F172A] disabled:opacity-60">
        {loading ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}
