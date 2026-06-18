"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const response = await fetch("/api/members/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setErr(data.error || "Could not create account.");
      return;
    }

    router.push("/members/pending");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none transition focus:border-teal-300/60"
        />
      </label>
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
          autoComplete="new-password"
          className="mt-2 w-full rounded-xl border border-[#2B4162] bg-slate-700/50 px-4 py-3 text-white outline-none transition focus:border-teal-300/60"
        />
      </label>
      {err ? <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</div> : null}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-teal-300 px-4 py-3 font-semibold text-[#0F172A] transition hover:bg-teal-200 disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
