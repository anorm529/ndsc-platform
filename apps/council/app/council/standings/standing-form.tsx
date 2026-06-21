"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, Check } from "lucide-react";
import type { StandingRow } from "@/lib/standings-queries";

const CURRENT_YEAR = new Date().getFullYear();

function inputClass() {
  return "w-full rounded-lg border border-[color:var(--border)] px-2.5 py-1.5 text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]";
}

function labelClass() {
  return "mb-0.5 block text-[0.68rem] font-medium text-[color:var(--muted-foreground)]";
}

export function AddStandingForm({ onAdded }: { onAdded?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [team, setTeam] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [division, setDivision] = useState("");
  const [wins, setWins] = useState("0");
  const [losses, setLosses] = useState("0");
  const [points, setPoints] = useState("0");
  const [runsFor, setRunsFor] = useState("0");
  const [runsAgainst, setRunsAgainst] = useState("0");
  const [streak, setStreak] = useState("");

  function reset() {
    setTeam(""); setYear(String(CURRENT_YEAR)); setDivision("");
    setWins("0"); setLosses("0"); setPoints("0"); setRunsFor("0"); setRunsAgainst("0"); setStreak("");
    setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!team.trim()) { setErr("Team name is required"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: team.trim(), year: Number(year), division: division || null, wins: Number(wins), losses: Number(losses), points: Number(points), runs_for: Number(runsFor), runs_against: Number(runsAgainst), streak: streak || null }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed"); return; }
      reset(); setOpen(false); onAdded?.(); router.refresh();
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-[rgba(20,184,166,0.1)] px-4 py-2 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.18)]"
      >
        <Plus className="h-3.5 w-3.5" /> Add row
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="council-panel rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.82rem] font-semibold text-slate-800">New standings row</p>
        <button type="button" onClick={() => { reset(); setOpen(false); }} className="text-[color:var(--muted-foreground)] hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={labelClass()}>Team name</label>
          <input type="text" required value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. NDSC Rooks" className={inputClass()} />
        </div>
        <div>
          <label className={labelClass()}>Year</label>
          <input type="number" required value={year} onChange={(e) => setYear(e.target.value)} className={inputClass()} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <div>
          <label className={labelClass()}>Division</label>
          <select value={division} onChange={(e) => setDivision(e.target.value)} className={inputClass()}>
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        <div>
          <label className={labelClass()}>Wins</label>
          <input type="number" min="0" value={wins} onChange={(e) => setWins(e.target.value)} className={inputClass()} />
        </div>
        <div>
          <label className={labelClass()}>Losses</label>
          <input type="number" min="0" value={losses} onChange={(e) => setLosses(e.target.value)} className={inputClass()} />
        </div>
        <div>
          <label className={labelClass()}>Points</label>
          <input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass()} />
        </div>
        <div>
          <label className={labelClass()}>Streak</label>
          <input type="text" value={streak} onChange={(e) => setStreak(e.target.value)} placeholder="e.g. W3" className={inputClass()} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass()}>Runs scored</label>
          <input type="number" min="0" value={runsFor} onChange={(e) => setRunsFor(e.target.value)} className={inputClass()} />
        </div>
        <div>
          <label className={labelClass()}>Runs against</label>
          <input type="number" min="0" value={runsAgainst} onChange={(e) => setRunsAgainst(e.target.value)} className={inputClass()} />
        </div>
      </div>

      <div className="text-[0.68rem] text-[color:var(--muted-foreground)]">
        Difference: {Number(runsFor) - Number(runsAgainst) >= 0 ? "+" : ""}{Number(runsFor) - Number(runsAgainst)}
      </div>

      {err && <p className="text-[0.72rem] text-[color:var(--danger)]">{err}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-[color:var(--accent)] px-4 py-2 text-[0.78rem] font-medium text-white hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </button>
        <button type="button" onClick={() => { reset(); setOpen(false); }} className="rounded-xl border px-4 py-2 text-[0.78rem] font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EditStandingForm({ row, onDone }: { row: StandingRow; onDone: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [team, setTeam] = useState(row.team);
  const [year, setYear] = useState(String(row.year));
  const [division, setDivision] = useState(row.division ?? "");
  const [wins, setWins] = useState(String(row.wins));
  const [losses, setLosses] = useState(String(row.losses));
  const [points, setPoints] = useState(String(row.points));
  const [runsFor, setRunsFor] = useState(String(row.runs_for));
  const [runsAgainst, setRunsAgainst] = useState(String(row.runs_against));
  const [streak, setStreak] = useState(row.streak ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/standings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, team: team.trim(), year: Number(year), division: division || null, wins: Number(wins), losses: Number(losses), points: Number(points), runs_for: Number(runsFor), runs_against: Number(runsAgainst), streak: streak || null }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed"); return; }
      onDone(); router.refresh();
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 space-y-2 rounded-lg bg-slate-50/60 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <input type="text" required value={team} onChange={(e) => setTeam(e.target.value)} className={inputClass()} placeholder="Team name" />
        </div>
        <input type="number" required value={year} onChange={(e) => setYear(e.target.value)} className={inputClass()} />
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        <select value={division} onChange={(e) => setDivision(e.target.value)} className={inputClass()}>
          <option value="">—</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <input type="number" min="0" value={wins} onChange={(e) => setWins(e.target.value)} className={inputClass()} placeholder="Wins" />
        <input type="number" min="0" value={losses} onChange={(e) => setLosses(e.target.value)} className={inputClass()} placeholder="Losses" />
        <input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass()} placeholder="Points" />
        <input type="text" value={streak} onChange={(e) => setStreak(e.target.value)} className={inputClass()} placeholder="Streak" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="number" min="0" value={runsFor} onChange={(e) => setRunsFor(e.target.value)} className={inputClass()} placeholder="Runs scored" />
        <input type="number" min="0" value={runsAgainst} onChange={(e) => setRunsAgainst(e.target.value)} className={inputClass()} placeholder="Runs against" />
      </div>
      {err && <p className="text-[0.72rem] text-[color:var(--danger)]">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex items-center gap-1 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-[0.75rem] font-medium text-white hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border px-3 py-1.5 text-[0.75rem] text-slate-600 hover:bg-slate-100">Cancel</button>
      </div>
    </form>
  );
}
