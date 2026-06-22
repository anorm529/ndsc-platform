"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw, Archive, AlertTriangle } from "lucide-react";

export function EosStatsPanel({ teams }: { teams: { id: string; name: string; slug: string }[] }) {
  const router = useRouter();

  // Refresh state
  const [rfYear, setRfYear] = useState("");
  const [rfTeam, setRfTeam] = useState("");
  const [rfLoading, setRfLoading] = useState(false);
  const [rfMsg, setRfMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Archive state
  const [arYear, setArYear] = useState("");
  const [arConfirm, setArConfirm] = useState(false);
  const [arLoading, setArLoading] = useState(false);
  const [arMsg, setArMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleRefresh(e: React.FormEvent) {
    e.preventDefault();
    setRfLoading(true);
    setRfMsg(null);
    try {
      const res = await fetch("/api/stats/eos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "refresh", year: rfYear ? parseInt(rfYear, 10) : undefined, teamSlug: rfTeam || undefined }),
      });
      const data = await res.json();
      setRfMsg(res.ok ? { ok: true, text: "Season stats refreshed successfully." } : { ok: false, text: data.error ?? "Refresh failed" });
      if (res.ok) router.refresh();
    } catch (err) {
      setRfMsg({ ok: false, text: String(err) });
    } finally {
      setRfLoading(false);
    }
  }

  async function handleArchive(e: React.FormEvent) {
    e.preventDefault();
    if (!arYear || !arConfirm) return;
    setArLoading(true);
    setArMsg(null);
    try {
      const res = await fetch("/api/stats/eos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "archive", year: parseInt(arYear, 10) }),
      });
      const data = await res.json();
      setArMsg(res.ok
        ? { ok: true, text: `${arYear} season stats archived and removed from the live table.` }
        : { ok: false, text: data.error ?? "Archive failed" });
      if (res.ok) { setArYear(""); setArConfirm(false); router.refresh(); }
    } catch (err) {
      setArMsg({ ok: false, text: String(err) });
    } finally {
      setArLoading(false);
    }
  }

  return (
    <section className="council-panel rounded-2xl border p-5 space-y-5">
      <div className="flex items-center gap-2">
        <RefreshCcw className="h-4 w-4 text-[color:var(--accent)]" />
        <h3 className="text-[0.92rem] font-semibold text-slate-800">End-of-season stats</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Refresh */}
        <form onSubmit={handleRefresh} className="space-y-3 rounded-xl border border-[color:var(--border)] p-4">
          <p className="text-[0.82rem] font-semibold text-slate-800">Refresh season stats</p>
          <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
            Aggregates all uploaded game stats into per-player season totals. Safe to run at any time — overwrites previous totals.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[0.68rem] font-medium text-[color:var(--muted-foreground)]">Year (optional)</label>
              <input
                type="number"
                value={rfYear}
                onChange={(e) => setRfYear(e.target.value)}
                placeholder="e.g. 2027"
                className="w-full rounded-lg border border-[color:var(--border)] px-2.5 py-1.5 text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[0.68rem] font-medium text-[color:var(--muted-foreground)]">Team (optional)</label>
              <select
                value={rfTeam}
                onChange={(e) => setRfTeam(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-white px-2.5 py-1.5 text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
              >
                <option value="">All teams</option>
                {teams.map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
              </select>
            </div>
          </div>
          {rfMsg && (
            <p className={`text-[0.72rem] ${rfMsg.ok ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}>
              {rfMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={rfLoading}
            className="flex items-center gap-1.5 rounded-xl bg-[rgba(20,184,166,0.1)] px-4 py-2 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.18)] disabled:opacity-50"
          >
            {rfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Run refresh
          </button>
        </form>

        {/* Archive */}
        <form onSubmit={handleArchive} className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4">
          <div className="flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5 text-[color:var(--danger)]" />
            <p className="text-[0.82rem] font-semibold text-slate-800">Archive completed season</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[0.7rem] text-amber-800">
              This permanently moves season stats to the archive table and <strong>removes them from the live table</strong>. The website will read from the archive going forward. Cannot be undone.
            </p>
          </div>
          <div>
            <label className="mb-0.5 block text-[0.68rem] font-medium text-[color:var(--muted-foreground)]">Year to archive</label>
            <input
              type="number"
              required
              value={arYear}
              onChange={(e) => setArYear(e.target.value)}
              placeholder="e.g. 2026"
              className="w-full rounded-lg border border-[color:var(--border)] px-2.5 py-1.5 text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={arConfirm}
              onChange={(e) => setArConfirm(e.target.checked)}
              className="rounded"
            />
            <span className="text-[0.72rem] text-slate-700">
              I understand this will delete the {arYear || "selected"} season from the live stats table
            </span>
          </label>
          {arMsg && (
            <p className={`text-[0.72rem] ${arMsg.ok ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}>
              {arMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={arLoading || !arConfirm || !arYear}
            className="flex items-center gap-1.5 rounded-xl bg-[rgba(239,68,68,0.08)] px-4 py-2 text-[0.78rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-40"
          >
            {arLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            Archive season
          </button>
        </form>
      </div>
    </section>
  );
}
