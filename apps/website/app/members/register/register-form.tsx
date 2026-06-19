"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }
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

  const inputClass = "mt-2 w-full rounded-xl border bg-slate-700/50 px-4 py-3 text-white outline-none transition focus:border-teal-300/60";

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={`${inputClass} border-[#2B4162]`}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className={`${inputClass} border-[#2B4162]`}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Password</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          className={`${inputClass} border-[#2B4162]`}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-200">Confirm password</span>
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          className={`${inputClass} ${passwordMismatch ? "border-rose-400/60" : "border-[#2B4162]"}`}
        />
        {passwordMismatch ? (
          <span className="mt-1 block text-xs text-rose-300">Passwords do not match.</span>
        ) : null}
      </label>
      {err ? (
        <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {err}
        </div>
      ) : null}
      <button
        disabled={loading || passwordMismatch}
        className="w-full rounded-xl bg-teal-300 px-4 py-3 font-semibold text-[#0F172A] transition hover:bg-teal-200 disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
