"use client";

import { useState } from "react";
import { Loader2, CheckSquare, Square } from "lucide-react";
import type { PreviousSeasonPlayer } from "@/lib/season-queries";
import type { SeasonRow } from "@/lib/season-queries";

function playerName(p: PreviousSeasonPlayer): string {
  return p.registrationName || p.displayName || p.email?.split("@")[0] || "Unknown";
}

export function CarryForwardForm({
  prevPlayers,
  season,
  onCarryForward,
}: {
  prevPlayers: PreviousSeasonPlayer[];
  season: SeasonRow;
  onCarryForward: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const prevYear = season.year - 1;

  // Group by previous team
  const byTeam = new Map<string, PreviousSeasonPlayer[]>();
  const noTeam: PreviousSeasonPlayer[] = [];
  for (const p of prevPlayers) {
    if (p.prevTeamName) {
      const list = byTeam.get(p.prevTeamName) ?? [];
      list.push(p);
      byTeam.set(p.prevTeamName, list);
    } else {
      noTeam.push(p);
    }
  }

  const toggleAll = () => {
    if (selected.size === prevPlayers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prevPlayers.map((p) => p.playerId)));
    }
  };

  const toggleTeam = (teamName: string) => {
    const teamPlayers = byTeam.get(teamName) ?? [];
    const allSelected = teamPlayers.every((p) => selected.has(p.playerId));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        teamPlayers.forEach((p) => next.delete(p.playerId));
      } else {
        teamPlayers.forEach((p) => next.add(p.playerId));
      }
      return next;
    });
  };

  const toggle = (playerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.size === 0 || saving) return;
    setSaving(true);
    const fd = new FormData();
    selected.forEach((id) => fd.append("playerIds", id));
    await onCarryForward(fd);
  }

  const allSelected = selected.size === prevPlayers.length && prevPlayers.length > 0;

  return (
    <div className="council-panel rounded-2xl border p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h3 className="text-[0.92rem] font-semibold text-slate-800">
            Carry forward from {prevYear}
          </h3>
          <p className="mt-0.5 text-[0.78rem] text-[color:var(--muted-foreground)]">
            Select who's returning for {season.year} — they'll land in the unassigned pool.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-[0.75rem] text-[color:var(--accent)] hover:underline"
        >
          {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {Array.from(byTeam.entries()).map(([teamName, players]) => {
          const teamSelected = players.filter((p) => selected.has(p.playerId)).length;
          return (
            <div key={teamName}>
              <div className="mb-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTeam(teamName)}
                  className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)]"
                >
                  {teamSelected === players.length ? (
                    <CheckSquare className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {teamName}
                </button>
                <span className="text-[0.68rem] text-[color:var(--muted-foreground)]">
                  {teamSelected}/{players.length}
                </span>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {players.map((p) => (
                  <label
                    key={p.playerId}
                    className={[
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.82rem] transition-colors",
                      selected.has(p.playerId)
                        ? "border-[color:var(--accent)] bg-[rgba(20,184,166,0.04)]"
                        : "border-[color:var(--border)] hover:border-slate-300",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      name="playerIds"
                      value={p.playerId}
                      checked={selected.has(p.playerId)}
                      onChange={() => toggle(p.playerId)}
                      className="accent-teal-600"
                    />
                    <span className="flex-1 font-medium text-slate-800 truncate">{playerName(p)}</span>
                    {p.gender?.toLowerCase() === "female" && (
                      <span className="text-[0.6rem] font-medium text-[#E84AA5]">F</span>
                    )}
                    {p.gender?.toLowerCase() === "male" && (
                      <span className="text-[0.6rem] font-medium text-[#1ED0D8]">M</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {noTeam.length > 0 && (
          <div>
            <p className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              No team ({noTeam.length})
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {noTeam.map((p) => (
                <label
                  key={p.playerId}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.82rem] transition-colors",
                    selected.has(p.playerId)
                      ? "border-[color:var(--accent)] bg-[rgba(20,184,166,0.04)]"
                      : "border-[color:var(--border)] hover:border-slate-300",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    name="playerIds"
                    value={p.playerId}
                    checked={selected.has(p.playerId)}
                    onChange={() => toggle(p.playerId)}
                    className="accent-teal-600"
                  />
                  <span className="flex-1 font-medium text-slate-800 truncate">{playerName(p)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-[color:var(--border)] pt-4">
          <span className="mr-auto text-[0.78rem] text-[color:var(--muted-foreground)]">
            {selected.size} of {prevPlayers.length} selected
          </span>
          <button
            type="submit"
            disabled={saving || selected.size === 0}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-5 py-2.5 text-[0.85rem] font-medium text-white hover:brightness-105 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enroll {selected.size > 0 ? selected.size : ""} {selected.size === 1 ? "player" : "players"}
          </button>
        </div>
      </form>
    </div>
  );
}
