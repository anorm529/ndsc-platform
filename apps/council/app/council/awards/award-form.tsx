"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, X, Medal } from "lucide-react";
import { AWARD_TYPES } from "@/lib/award-constants";

const CURRENT_YEAR = new Date().getFullYear();

function inputClass() {
  return "w-full rounded-lg border border-[color:var(--border)] px-2.5 py-1.5 text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]";
}

function labelClass() {
  return "mb-0.5 block text-[0.68rem] font-medium text-[color:var(--muted-foreground)]";
}

type Season = { id: string; year: number };
type Team = { id: string; name: string; slug: string };

export function AddAwardForm({ seasons, teams }: { seasons: Season[]; teams: Team[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [seasonId, setSeasonId] = useState(
    seasons.find((s) => s.year === CURRENT_YEAR)?.id ?? seasons[0]?.id ?? ""
  );
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [award, setAward] = useState<string>(AWARD_TYPES[0]);
  const [player, setPlayer] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setSeasonId(seasons.find((s) => s.year === CURRENT_YEAR)?.id ?? seasons[0]?.id ?? "");
    setTeamId(teams[0]?.id ?? "");
    setAward(AWARD_TYPES[0]);
    setPlayer("");
    setNotes("");
    setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!award) { setErr("Award type is required"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: seasonId || null,
          teamId: teamId || null,
          playerText: player.trim() || null,
          award,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed"); return; }
      reset(); setOpen(false); router.refresh();
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-[rgba(20,184,166,0.1)] px-4 py-2 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.18)]"
      >
        <Plus className="h-3.5 w-3.5" /> Add award
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="council-panel rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-[color:var(--accent)]" />
          <p className="text-[0.82rem] font-semibold text-slate-800">New award</p>
        </div>
        <button type="button" onClick={() => { reset(); setOpen(false); }} className="text-[color:var(--muted-foreground)] hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass()}>Season</label>
          <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className={inputClass()}>
            <option value="">No season</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass()}>Team</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClass()}>
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass()}>Award</label>
          <select value={award} onChange={(e) => setAward(e.target.value)} required className={inputClass()}>
            {AWARD_TYPES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass()}>Player</label>
          <input
            type="text"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Player name"
            className={inputClass()}
          />
        </div>
      </div>

      <div>
        <label className={labelClass()}>Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes"
          className={inputClass()}
        />
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
