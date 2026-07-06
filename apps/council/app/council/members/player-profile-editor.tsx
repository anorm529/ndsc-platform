"use client";

import { useState } from "react";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import type { PlayerProfile } from "@/lib/council-queries";

type Props = {
  playerId: string;
  profile: PlayerProfile | null;
};

export function PlayerProfileEditor({ playerId, profile: initial }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile>({
    playerId,
    yearOfBirth: initial?.yearOfBirth ?? null,
    postcode: initial?.postcode ?? null,
    isRookie: initial?.isRookie ?? false,
    isUmpire: initial?.isUmpire ?? false,
    notes: initial?.notes ?? null,
  });

  // Local form state (uncommitted until Save)
  const [draft, setDraft] = useState({ ...profile });

  function openEditor() {
    setDraft({ ...profile });
    setSaveError(null);
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/player-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          yearOfBirth: draft.yearOfBirth || null,
          postcode: draft.postcode || null,
          isRookie: draft.isRookie,
          isUmpire: draft.isUmpire,
          notes: draft.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile({ ...draft });
      setOpen(false);
    } catch {
      setSaveError("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  }

  const hasProfile = profile.yearOfBirth || profile.postcode || profile.isRookie || profile.isUmpire;

  return (
    <div className="relative">
      {/* Summary badges + edit trigger */}
      <div className="flex flex-wrap items-center gap-1.5">
        {!open && profile.yearOfBirth ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] text-slate-500">
            b. {profile.yearOfBirth}
          </span>
        ) : null}
        {!open && profile.postcode ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] text-slate-500">
            {profile.postcode.toUpperCase()}
          </span>
        ) : null}
        {!open && profile.isRookie ? (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-600">
            Rookie
          </span>
        ) : null}
        {!open && profile.isUmpire ? (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-blue-600">
            Umpire
          </span>
        ) : null}
        <button
          onClick={open ? cancel : openEditor}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {open ? <X className="h-2.5 w-2.5" /> : <Pencil className="h-2.5 w-2.5" />}
          {open ? "Close" : hasProfile ? "Edit" : "Add profile"}
        </button>
      </div>

      {/* Floating edit form — absolutely positioned so it doesn't displace grid rows */}
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-[color:var(--border)] bg-white shadow-lg p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-0.5 block text-[0.68rem] font-medium text-slate-500">Year of birth</span>
              <input
                type="number"
                min={1940}
                max={2015}
                placeholder="e.g. 1995"
                value={draft.yearOfBirth ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, yearOfBirth: e.target.value ? parseInt(e.target.value, 10) : null }))}
                className="w-full rounded-lg border border-[color:var(--border)] bg-white px-2.5 py-1.5 text-[0.78rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[0.68rem] font-medium text-slate-500">Postcode</span>
              <input
                type="text"
                placeholder="e.g. BT23 4AB"
                value={draft.postcode ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, postcode: e.target.value }))}
                className="w-full rounded-lg border border-[color:var(--border)] bg-white px-2.5 py-1.5 text-[0.78rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
              />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isRookie}
                onChange={(e) => setDraft((d) => ({ ...d, isRookie: e.target.checked }))}
                className="h-3.5 w-3.5 rounded accent-amber-500"
              />
              <span className="text-[0.78rem] font-medium text-slate-700">Rookie</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isUmpire}
                onChange={(e) => setDraft((d) => ({ ...d, isUmpire: e.target.checked }))}
                className="h-3.5 w-3.5 rounded accent-blue-500"
              />
              <span className="text-[0.78rem] font-medium text-slate-700">Umpire</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-0.5 block text-[0.68rem] font-medium text-slate-500">Notes</span>
            <textarea
              rows={2}
              placeholder="Internal notes…"
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className="w-full resize-none rounded-lg border border-[color:var(--border)] bg-white px-2.5 py-1.5 text-[0.78rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            />
          </label>

          <div className="flex flex-col items-end gap-1">
            {saveError && <p className="text-[0.68rem] text-[color:var(--danger)]">{saveError}</p>}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-[0.75rem] font-medium text-white hover:brightness-105 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
