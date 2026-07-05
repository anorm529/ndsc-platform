"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import type { StatRecord } from "@/lib/stats-queries";

type EditState = {
  innings: string;
  singles: string; doubles: string; triples: string; homeRuns: string;
  rbis: string; runs: string; walks: string;
  batterOuts: string; atBats: string; unassistedOuts: string; assistedOuts: string;
};

function toEdit(r: StatRecord): EditState {
  return {
    innings: r.innings == null ? "" : String(r.innings),
    singles: String(r.singles), doubles: String(r.doubles), triples: String(r.triples), homeRuns: String(r.homeRuns),
    rbis: String(r.rbis), runs: String(r.runs), walks: String(r.walks),
    batterOuts: String(r.batterOuts), atBats: String(r.atBats),
    unassistedOuts: String(r.unassistedOuts), assistedOuts: String(r.assistedOuts),
  };
}

function num(v: string): number | null {
  const n = parseFloat(v);
  return v.trim() === "" || isNaN(n) ? null : n;
}

const COLS: { key: keyof EditState; label: string; nullable?: boolean }[] = [
  { key: "innings", label: "IP", nullable: true },
  { key: "singles", label: "1B" },
  { key: "doubles", label: "2B" },
  { key: "triples", label: "3B" },
  { key: "homeRuns", label: "HR" },
  { key: "rbis", label: "RBI" },
  { key: "runs", label: "R" },
  { key: "walks", label: "BB" },
  { key: "batterOuts", label: "Outs" },
  { key: "atBats", label: "AB" },
  { key: "unassistedOuts", label: "UAO" },
  { key: "assistedOuts", label: "AO" },
];

function StatRow({ record, canEdit }: { record: StatRecord; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>(() => toEdit(record));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/stats/records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        innings: num(form.innings),
        singles: num(form.singles) ?? 0,
        doubles: num(form.doubles) ?? 0,
        triples: num(form.triples) ?? 0,
        homeRuns: num(form.homeRuns) ?? 0,
        rbis: num(form.rbis) ?? 0,
        runs: num(form.runs) ?? 0,
        walks: num(form.walks) ?? 0,
        batterOuts: num(form.batterOuts) ?? 0,
        atBats: num(form.atBats) ?? 0,
        unassistedOuts: num(form.unassistedOuts) ?? 0,
        assistedOuts: num(form.assistedOuts) ?? 0,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Failed to save — try again");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete stats for ${record.playerName}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/stats/records/${record.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Failed to delete — try again");
      return;
    }
    router.refresh();
  }

  function field(key: keyof EditState) {
    return (
      <input
        type="number"
        min="0"
        step="0.1"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-12 rounded border border-[color:var(--border)] px-1 py-0.5 text-center text-[0.75rem] outline-none focus:border-teal-400"
      />
    );
  }

  if (editing) {
    return (
      <tr className="border-b border-[color:var(--border)] bg-teal-50/30">
        <td className="py-2 pr-3 text-[0.82rem] font-medium text-slate-800">{record.playerName}</td>
        {COLS.map((col) => (
          <td key={col.key} className="py-2 pr-2 text-center">{field(col.key)}</td>
        ))}
        <td className="py-2 text-right">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="rounded p-1 text-[color:var(--success)] hover:bg-[rgba(16,185,129,0.1)] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setForm(toEdit(record)); setError(null); }}
                disabled={busy}
                className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {error && <p className="text-[0.65rem] text-[color:var(--danger)]">{error}</p>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[color:var(--border)] hover:bg-slate-50/50">
      <td className="py-2 pr-3 text-[0.82rem] font-medium text-slate-800">{record.playerName}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.innings ?? "—"}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.singles}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.doubles}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.triples}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.homeRuns}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.rbis}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.runs}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.walks}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.batterOuts}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.atBats}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.unassistedOuts}</td>
      <td className="py-2 pr-2 text-center text-[0.78rem] text-slate-600">{record.assistedOuts}</td>
      {canEdit && (
        <td className="py-2 text-right">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setEditing(true); setError(null); }}
                disabled={busy}
                className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-slate-100 hover:text-teal-600 disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
            {error && <p className="text-[0.65rem] text-[color:var(--danger)]">{error}</p>}
          </div>
        </td>
      )}
    </tr>
  );
}

export function StatRecordsTable({ records, canEdit }: { records: StatRecord[]; canEdit: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.8rem]">
        <thead>
          <tr className="border-b border-[color:var(--border)] text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            <th className="pb-2 pr-3">Player</th>
            {COLS.map((col) => (
              <th key={col.key} className="pb-2 pr-2 text-center">{col.label}</th>
            ))}
            {canEdit && <th className="pb-2" />}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <StatRow key={r.id} record={r} canEdit={canEdit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
