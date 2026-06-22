"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCog, X } from "lucide-react";
import type { TeamRow } from "@/lib/season-queries";
import type { MemberRow } from "@/lib/main-db";

type CaptainMap = Record<string, { userId: string; name: string } | null>;

export function CaptainAssignmentForm({
  teams,
  seasonYear,
  captainMap,
  members,
}: {
  teams: TeamRow[];
  seasonYear: number;
  captainMap: CaptainMap;
  members: MemberRow[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  function memberName(m: MemberRow): string {
    return m.registrationName || m.displayName || m.email.split("@")[0];
  }

  async function handleAssign(teamId: string, userId: string) {
    if (!userId) {
      await handleRemove(teamId);
      return;
    }
    setSaving(teamId);
    try {
      await fetch("/api/seasons/captains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, teamId, seasonYear }),
      });
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(teamId: string) {
    setSaving(teamId);
    try {
      await fetch("/api/seasons/captains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, seasonYear }),
      });
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="council-panel rounded-2xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-[color:var(--accent)]" />
        <h3 className="text-[0.92rem] font-semibold text-slate-800">Captain assignments</h3>
        <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">{seasonYear} season</span>
      </div>

      <div className="space-y-3">
        {teams.map((team) => {
          const current = captainMap[team.id] ?? null;
          const isSaving = saving === team.id;

          return (
            <div key={team.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.85rem] font-medium text-slate-800">{team.name}</p>
                {current ? (
                  <p className="text-[0.72rem] text-[color:var(--success)]">
                    Captain: {current.name}
                  </p>
                ) : (
                  <p className="text-[0.72rem] italic text-[color:var(--muted-foreground)]">No captain assigned</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--muted-foreground)]" />}

                <select
                  disabled={isSaving}
                  value={current?.userId ?? ""}
                  onChange={(e) => handleAssign(team.id, e.target.value)}
                  className="rounded-lg border border-[color:var(--border)] bg-white py-1.5 pl-2.5 pr-7 text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)] disabled:opacity-50"
                >
                  <option value="">— Unassigned —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {memberName(m)}
                    </option>
                  ))}
                </select>

                {current && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRemove(team.id)}
                    title="Remove captain"
                    className="rounded-lg p-1.5 text-[color:var(--muted-foreground)] hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
