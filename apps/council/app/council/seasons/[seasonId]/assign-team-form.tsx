"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { TeamRow } from "@/lib/season-queries";

export function AssignTeamForm({
  playerId,
  seasonId,
  currentTeamId,
  teams,
  userId,
}: {
  playerId: string;
  seasonId: string;
  currentTeamId: string | null;
  teams: TeamRow[];
  userId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(newTeamId: string) {
    const value = newTeamId === "" ? null : newTeamId;
    if (value === currentTeamId) return;
    setSaving(true);
    try {
      await fetch("/api/seasons/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, seasonId, teamId: value, userId }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-[color:var(--muted-foreground)]" />}
      <select
        disabled={saving}
        defaultValue={currentTeamId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-[color:var(--border)] bg-white py-1 pl-2 pr-6 text-[0.72rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)] disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
