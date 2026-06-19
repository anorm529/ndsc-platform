"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setReason(null);
    setResendStatus("idle");
    setLoading(true);

    const response = await fetch("/api/members/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setErr(data.error || "Could not sign in.");
      setReason(data.reason ?? null);
      return;
    }

    router.push("/members/home");
    router.refresh();
  }

  async function resendVerification() {
    setResendStatus("sending");
    await fetch("/api/members/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
    setResendStatus("sent");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none transition focus:border-teal-300/60"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Password</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none transition focus:border-teal-300/60"
        />
      </label>
      {err ? (
        <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {err}
          {reason === "pending" && resendStatus !== "sent" ? (
            <button
              type="button"
              onClick={resendVerification}
              disabled={resendStatus === "sending"}
              className="mt-2 block text-xs font-semibold text-teal-400 hover:text-teal-300 disabled:opacity-60"
            >
              {resendStatus === "sending" ? "Sending…" : "Resend verification email"}
            </button>
          ) : reason === "pending" && resendStatus === "sent" ? (
            <span className="mt-2 block text-xs text-teal-400">Verification email sent — check your inbox.</span>
          ) : null}
        </div>
      ) : null}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-teal-300 px-4 py-3 font-semibold text-[#0F172A] transition hover:bg-teal-200 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
