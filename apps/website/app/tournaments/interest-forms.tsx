"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const inputClass =
  "w-full rounded-xl border-2 border-[#2B2254]/20 bg-white px-4 py-3 text-sm text-[#2B2254] placeholder-[#9d8fba] outline-none focus:border-[#E84AA5] transition";

const labelClass = "block text-xs font-black uppercase tracking-wide text-[#604c7c] mb-1.5";

function SuccessState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <CheckCircle2 className="h-10 w-10 text-[#1cbbc5]" />
      <p className="font-black uppercase italic tracking-tight text-[#2B2254]">{message}</p>
      <p className="text-sm text-[#7c6fa0]">We'll be in touch as 2027 plans take shape.</p>
    </div>
  );
}

export function PlayerInterestForm() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", email: "", phone: "", experience: "", notes: "" });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/tournament-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "player", ...form }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <SuccessState message="You're on the list!" />;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1cbbc5] px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-[0_8px_0_rgba(43,34,84,0.18)] transition hover:translate-y-[1px]"
      >
        Player Interest
        <ArrowRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div>
        <label className={labelClass}>Full name *</label>
        <input required className={inputClass} placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input required type="email" className={inputClass} placeholder="your@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Phone (optional)</label>
        <input className={inputClass} placeholder="+44 7700 000000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Experience level *</label>
        <select
          required
          className={inputClass}
          value={form.experience}
          onChange={(e) => set("experience", e.target.value)}
        >
          <option value="" disabled>Select…</option>
          <option value="never">Never played before</option>
          <option value="beginner">Beginner</option>
          <option value="some">Some experience</option>
          <option value="experienced">Experienced</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Anything else? (optional)</label>
        <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Any questions or context…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {status === "error" && (
        <p className="text-sm font-semibold text-red-600">Something went wrong — please try again or email us directly.</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-2xl border-2 border-[#2B2254]/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[#604c7c] transition hover:border-[#2B2254]/40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1cbbc5] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_6px_0_rgba(43,34,84,0.18)] transition hover:translate-y-[1px] disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {status === "loading" ? "Sending…" : "Register Interest"}
        </button>
      </div>
    </form>
  );
}

export function TeamInterestForm() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", email: "", phone: "", team_name: "", team_size: "", notes: "" });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/tournament-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "team", ...form, team_size: Number(form.team_size) }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <SuccessState message="Team interest registered!" />;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e33ea8] px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-[0_8px_0_rgba(43,34,84,0.18)] transition hover:translate-y-[1px]"
      >
        Team Interest
        <ArrowRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div>
        <label className={labelClass}>Contact name *</label>
        <input required className={inputClass} placeholder="Captain / organiser name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input required type="email" className={inputClass} placeholder="your@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Phone (optional)</label>
        <input className={inputClass} placeholder="+44 7700 000000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Team name *</label>
        <input required className={inputClass} placeholder="Your team name" value={form.team_name} onChange={(e) => set("team_name", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Approx. number of players *</label>
        <input
          required
          type="number"
          min={1}
          max={50}
          className={inputClass}
          placeholder="e.g. 12"
          value={form.team_size}
          onChange={(e) => set("team_size", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>Anything else? (optional)</label>
        <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Any questions or context…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {status === "error" && (
        <p className="text-sm font-semibold text-red-600">Something went wrong — please try again or email us directly.</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-2xl border-2 border-[#2B2254]/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[#604c7c] transition hover:border-[#2B2254]/40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e33ea8] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_6px_0_rgba(43,34,84,0.18)] transition hover:translate-y-[1px] disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {status === "loading" ? "Sending…" : "Register Team"}
        </button>
      </div>
    </form>
  );
}
