"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

export function EnrollExistingForm({
  seasonId,
  userId,
}: {
  seasonId: string;
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gender, setGender] = useState("Unknown");
  const [isNew, setIsNew] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/players/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: playerName.trim(),
          gender,
          seasonId,
          enrolledBy: userId,
          isNew,
        }),
      });
      if (!res.ok) throw new Error();
      setPlayerName("");
      setGender("Unknown");
      setIsNew(false);
      setOpen(false);
      router.refresh();
    } catch {
      // stay open
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-[color:var(--border)] px-3 py-2 text-[0.78rem] text-[color:var(--muted-foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] w-full"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add individual player
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[0.73rem] font-medium text-[color:var(--muted-foreground)]">
            Player name
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Full name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.73rem] font-medium text-[color:var(--muted-foreground)]">
            Gender
          </label>
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

      <label className="flex items-center gap-2 text-[0.78rem] text-[color:var(--muted-foreground)] cursor-pointer">
        <input
          type="checkbox"
          checked={isNew}
          onChange={(e) => setIsNew(e.target.checked)}
          className="accent-teal-600"
        />
        New player (creates a new record — use for first-time NDSC players)
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !playerName.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2 text-[0.82rem] font-medium text-white hover:brightness-105 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add & enroll
        </button>
      </div>
    </form>
  );
}
