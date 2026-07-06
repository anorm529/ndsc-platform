"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import type { TeamRow } from "@/lib/season-queries";

export function AddFixtureForm({ seasonId, teams }: { seasonId: string; teams: TeamRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    teamId: teams[0]?.id ?? "",
    opponent: "",
    scheduledAt: "",
    homeAway: "Home",
    location: "",
    latitude: "",
    longitude: "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.teamId || !form.opponent || !form.scheduledAt) return;
    setSaving(true);
    try {
      await fetch("/api/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          seasonId,
          latitude: form.latitude !== "" ? parseFloat(form.latitude) : null,
          longitude: form.longitude !== "" ? parseFloat(form.longitude) : null,
        }),
      });
      setForm({ teamId: teams[0]?.id ?? "", opponent: "", scheduledAt: "", homeAway: "Home", location: "", latitude: "", longitude: "" });
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-semibold text-white hover:brightness-105"
      >
        <Plus className="h-3.5 w-3.5" />
        Add fixture
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="council-panel rounded-2xl border p-5 space-y-3">
      <p className="text-[0.88rem] font-semibold text-slate-800">New fixture</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Team</label>
          <select
            required
            value={form.teamId}
            onChange={(e) => set("teamId", e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          >
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Opponent</label>
          <input
            required
            type="text"
            value={form.opponent}
            onChange={(e) => set("opponent", e.target.value)}
            placeholder="e.g. Red Sox"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Date & time</label>
          <input
            required
            type="datetime-local"
            min="2000-01-01T00:00"
            value={form.scheduledAt}
            onChange={(e) => set("scheduledAt", e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Home / Away</label>
          <select
            value={form.homeAway}
            onChange={(e) => set("homeAway", e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          >
            <option value="Home">Home</option>
            <option value="Away">Away</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Location (optional)</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Ormeau Park, Belfast"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Latitude (optional)</label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => set("latitude", e.target.value)}
            placeholder="e.g. 54.5918"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">Longitude (optional)</label>
          <input
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => set("longitude", e.target.value)}
            placeholder="e.g. -5.9301"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-[0.82rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-5 py-2 text-[0.82rem] font-semibold text-white hover:brightness-105 disabled:opacity-50"
        >
          {saving ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : "Add fixture"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-[0.82rem] text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
