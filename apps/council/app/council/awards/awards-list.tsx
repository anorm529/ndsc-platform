"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Medal } from "lucide-react";
import type { AwardRow } from "@/lib/awards-queries";

const AWARD_COLORS: Record<string, string> = {
  "Male MVP":       "bg-blue-50 text-blue-700 border-blue-200",
  "Female MVP":     "bg-pink-50 text-pink-700 border-pink-200",
  "Spirit Award":   "bg-purple-50 text-purple-700 border-purple-200",
  "Golden Glove":   "bg-amber-50 text-amber-700 border-amber-200",
  "Captains Choice":"bg-teal-50 text-teal-700 border-teal-200",
  "Rookie":         "bg-green-50 text-green-700 border-green-200",
};

export function AwardsList({ rows, canManage }: { rows: AwardRow[]; canManage: boolean }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this award?")) return;
    setDeletingId(id);
    try {
      await fetch("/api/awards", {
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
        No awards yet.
      </p>
    );
  }

  // Group by team
  const byTeam = new Map<string, AwardRow[]>();
  for (const row of rows) {
    const key = row.team_name ?? "Other";
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(row);
  }
  const teams = [...byTeam.keys()].sort();

  return (
    <div className="space-y-4">
      {teams.map((teamName) => (
        <div key={teamName}>
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {teamName}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byTeam.get(teamName)!.map((award) => {
              const colorClass = AWARD_COLORS[award.award] ?? "bg-slate-50 text-slate-700 border-slate-200";
              const playerLabel = award.player_name ?? award.player_text ?? null;
              return (
                <div
                  key={award.id}
                  className={`relative flex items-start gap-2.5 rounded-xl border p-3 ${colorClass}`}
                >
                  <Medal className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.78rem] font-semibold leading-tight">{award.award}</p>
                    {playerLabel && (
                      <p className="mt-0.5 text-[0.72rem] font-medium opacity-80">{playerLabel}</p>
                    )}
                    {award.notes && (
                      <p className="mt-0.5 text-[0.68rem] opacity-60">{award.notes}</p>
                    )}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(award.id)}
                      disabled={deletingId === award.id}
                      className="shrink-0 rounded p-0.5 opacity-40 hover:opacity-80 disabled:opacity-20"
                      title="Delete"
                    >
                      {deletingId === award.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
