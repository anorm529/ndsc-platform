"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import type { StandingRow } from "@/lib/standings-queries";
import { EditStandingForm } from "./standing-form";

function ResultBadge({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-slate-700">
      <span className="font-medium">{value}</span>
      <span className="ml-0.5 text-[0.65rem] text-[color:var(--muted-foreground)]">{label}</span>
    </span>
  );
}

export function StandingsTable({
  rows,
  canManage,
}: {
  rows: StandingRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this standings row?")) return;
    setDeletingId(id);
    try {
      await fetch("/api/standings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-[0.82rem] italic text-[color:var(--muted-foreground)]">
        No standings rows found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.8rem]">
        <thead>
          <tr className="border-b border-[color:var(--border)] text-left text-[0.67rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            <th className="pb-2 pr-3">Team</th>
            <th className="pb-2 pr-3">Div</th>
            <th className="pb-2 pr-3 text-right">W</th>
            <th className="pb-2 pr-3 text-right">L</th>
            <th className="pb-2 pr-3 text-right">Pts</th>
            <th className="pb-2 pr-3 text-right">RS</th>
            <th className="pb-2 pr-3 text-right">RA</th>
            <th className="pb-2 pr-3 text-right">Diff</th>
            <th className="pb-2 pr-3">Streak</th>
            {canManage && <th className="pb-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 pr-3 font-medium text-slate-800">{row.team}</td>
                <td className="py-2 pr-3 text-slate-500">{row.division ?? "—"}</td>
                <td className="py-2 pr-3 text-right"><ResultBadge value={row.wins} label="" /></td>
                <td className="py-2 pr-3 text-right"><ResultBadge value={row.losses} label="" /></td>
                <td className="py-2 pr-3 text-right font-semibold text-[color:var(--accent)]">{row.points}</td>
                <td className="py-2 pr-3 text-right text-slate-600">{row.runs_for}</td>
                <td className="py-2 pr-3 text-right text-slate-600">{row.runs_against}</td>
                <td className="py-2 pr-3 text-right">
                  <span className={row.difference >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}>
                    {row.difference >= 0 ? "+" : ""}{row.difference}
                  </span>
                </td>
                <td className="py-2 pr-3 text-slate-500">{row.streak ?? "—"}</td>
                {canManage && (
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditId(editId === row.id ? null : row.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
              {editId === row.id && canManage && (
                <tr>
                  <td colSpan={canManage ? 10 : 9} className="pb-3 pt-0">
                    <EditStandingForm row={row} onDone={() => setEditId(null)} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
