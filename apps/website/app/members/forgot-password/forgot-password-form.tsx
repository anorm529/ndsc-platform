"use client";

import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setResetUrl(null);
    setLoading(true);

    const response = await fetch("/api/members/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(data.message || "If that email has an account, a reset link will be sent.");
    if (data.resetUrl) setResetUrl(data.resetUrl);
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">Email</span>
        <input
          value={email}
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none focus:border-teal-300/60"
        />
      </label>
      {message ? <div className="rounded-xl border border-teal-300/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-400">{message}</div> : null}
      {resetUrl ? (
        <a className="block break-all rounded-xl border border-[#2B4162] bg-slate-700/40 px-4 py-3 text-sm text-slate-200" href={resetUrl}>
          {resetUrl}
        </a>
      ) : null}
      <button disabled={loading} className="w-full rounded-xl bg-teal-300 px-4 py-3 font-semibold text-[#0F172A] disabled:opacity-60">
        {loading ? "Creating link..." : "Create reset link"}
      </button>
    </form>
  );
}
