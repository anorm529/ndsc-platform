"use client";

import { useState } from "react";

export default function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStatus("loading");

    const res = await fetch("/api/members/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErr(data.error || "Something went wrong. Try again.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="mt-4 rounded-xl border border-teal-400/20 bg-teal-400/10 px-4 py-3 text-sm text-teal-200">
        If that email matches a pending unverified account, a new link is on its way. Check
        your inbox (and spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="min-w-0 flex-1 rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-300/60"
      />
      <button
        disabled={status === "loading"}
        className="rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600/50 disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Resend"}
      </button>
      {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}
    </form>
  );
}
