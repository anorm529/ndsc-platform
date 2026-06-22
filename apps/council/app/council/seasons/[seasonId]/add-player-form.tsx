"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Search, UserCheck } from "lucide-react";
import type { PlayerRow } from "@/lib/main-db";

type Mode = "existing" | "new";

function playerLabel(p: PlayerRow): string {
  const name = p.registrationName || p.displayName || p.email?.split("@")[0] || "Unknown";
  const team = p.teamName ? ` · ${p.teamName}` : " · No team";
  const gender = p.gender?.toLowerCase() === "female" ? " · F" : p.gender?.toLowerCase() === "male" ? " · M" : "";
  return `${name}${team}${gender}`;
}

export function AddPlayerForm({
  seasonId,
  userId,
  unenrolled,
}: {
  seasonId: string;
  userId: string;
  unenrolled: PlayerRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("existing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // existing mode
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [search, setSearch] = useState("");

  // new mode
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("Unknown");
  const [email, setEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(false);

  const filtered = unenrolled.filter((p) => {
    if (!search.trim()) return true;
    const name = (p.registrationName || p.displayName || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  function reset() {
    setSelectedPlayerId("");
    setSearch("");
    setDisplayName("");
    setGender("Unknown");
    setEmail("");
    setSendInvite(false);
    setError(null);
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "existing" && !selectedPlayerId) {
      setError("Please select a player.");
      return;
    }
    if (mode === "new" && !displayName.trim()) {
      setError("Please enter a player name.");
      return;
    }

    setSaving(true);
    try {
      const body =
        mode === "existing"
          ? { mode: "existing", playerId: selectedPlayerId, seasonId }
          : { mode: "new", displayName: displayName.trim(), gender, email: email.trim() || undefined, sendInvite, seasonId };

      const res = await fetch("/api/players/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Something went wrong.");
        return;
      }

      reset();
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
        className="flex items-center gap-2 rounded-lg border border-dashed border-[color:var(--border)] px-3 py-2 text-[0.78rem] text-[color:var(--muted-foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] w-full transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add player
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex rounded-xl border border-[color:var(--border)] p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[0.78rem] font-medium transition-colors",
            mode === "existing"
              ? "bg-[rgba(20,184,166,0.1)] text-[color:var(--accent)]"
              : "text-[color:var(--muted-foreground)] hover:text-slate-700",
          ].join(" ")}
        >
          <Search className="h-3.5 w-3.5" />
          Existing player
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[0.78rem] font-medium transition-colors",
            mode === "new"
              ? "bg-[rgba(20,184,166,0.1)] text-[color:var(--accent)]"
              : "text-[color:var(--muted-foreground)] hover:text-slate-700",
          ].join(" ")}
        >
          <UserCheck className="h-3.5 w-3.5" />
          New player
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "existing" ? (
          /* ── Existing player ── */
          <div className="space-y-2">
            <p className="text-[0.73rem] text-[color:var(--muted-foreground)]">
              {unenrolled.length} active player{unenrolled.length !== 1 ? "s" : ""} not yet in this season
            </p>
            {unenrolled.length > 6 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-white py-2 pl-9 pr-3 text-[0.82rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
                />
              </div>
            )}
            {unenrolled.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8rem] text-[color:var(--muted-foreground)]">
                All active players are already enrolled in this season.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-[color:var(--border)]">
                {filtered.map((p) => {
                  const name = p.registrationName || p.displayName || p.email?.split("@")[0] || "Unknown";
                  return (
                    <label
                      key={p.playerId}
                      className={[
                        "flex cursor-pointer items-center gap-3 border-b border-[color:var(--border)] px-3 py-2.5 last:border-b-0 transition-colors",
                        selectedPlayerId === p.playerId
                          ? "bg-[rgba(20,184,166,0.06)]"
                          : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="existingPlayer"
                        value={p.playerId}
                        checked={selectedPlayerId === p.playerId}
                        onChange={() => setSelectedPlayerId(p.playerId)}
                        className="accent-teal-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.83rem] font-medium text-slate-800 truncate">{name}</p>
                        <p className="text-[0.7rem] text-[color:var(--muted-foreground)]">
                          {p.teamName ?? "No team"}{p.gender ? ` · ${p.gender}` : ""}
                        </p>
                      </div>
                      {!p.userId && (
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[0.6rem] text-slate-400">
                          no login
                        </span>
                      )}
                    </label>
                  );
                })}
                {filtered.length === 0 && search && (
                  <p className="px-3 py-4 text-center text-[0.8rem] text-[color:var(--muted-foreground)]">
                    No match for "{search}"
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── New player ── */
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[0.73rem] font-medium text-[color:var(--muted-foreground)]">
                  Full name <span className="text-[color:var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Jane Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.73rem] font-medium text-[color:var(--muted-foreground)]">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[0.85rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[0.73rem] font-medium text-[color:var(--muted-foreground)]">
                Email address <span className="text-slate-400">(optional — needed for platform access)</span>
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (!e.target.value) setSendInvite(false); }}
                className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
              />
            </div>

            {email.trim() && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[color:var(--border)] p-3 hover:border-slate-300 has-[:checked]:border-[color:var(--accent)] has-[:checked]:bg-[rgba(20,184,166,0.04)]">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="mt-0.5 accent-teal-600"
                />
                <div>
                  <p className="text-[0.83rem] font-medium text-slate-800">Send platform invite</p>
                  <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                    Creates a pending account and emails them a link to set their password (link valid 7 days)
                  </p>
                </div>
              </label>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-[rgba(239,68,68,0.08)] px-3 py-2 text-[0.78rem] text-[color:var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex gap-2 border-t border-[color:var(--border)] pt-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (mode === "existing" && !selectedPlayerId) || (mode === "new" && !displayName.trim())}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2 text-[0.82rem] font-medium text-white hover:brightness-105 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "new" && sendInvite ? "Add & send invite" : "Add & enroll"}
          </button>
        </div>
      </form>
    </div>
  );
}
