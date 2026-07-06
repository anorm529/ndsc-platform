"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";

export function ResultForm({ gameId, runsFor, runsAgainst }: { gameId: string; runsFor: number | null; runsAgainst: number | null }) {
  const router = useRouter();
  const [rf, setRf] = useState(runsFor?.toString() ?? "");
  const [ra, setRa] = useState(runsAgainst?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function handleSave() {
    const rfn = parseInt(rf, 10);
    const ran = parseInt(ra, 10);
    if (isNaN(rfn) || isNaN(ran)) return;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/fixtures/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: gameId, runsFor: rfn, runsAgainst: ran }),
      });
      if (!res.ok) { setError(true); return; }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        value={rf}
        onChange={(e) => { setRf(e.target.value); setSaved(false); }}
        placeholder="For"
        className="w-14 rounded-lg border border-[color:var(--border)] px-2 py-1 text-center text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
      />
      <span className="text-[0.72rem] text-[color:var(--muted-foreground)]">–</span>
      <input
        type="number"
        min="0"
        value={ra}
        onChange={(e) => { setRa(e.target.value); setSaved(false); }}
        placeholder="Against"
        className="w-14 rounded-lg border border-[color:var(--border)] px-2 py-1 text-center text-[0.78rem] text-slate-700 outline-none focus:border-[color:var(--border-strong)]"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !rf || !ra}
        className="rounded-lg bg-[color:var(--accent)] px-2.5 py-1 text-[0.72rem] font-medium text-white hover:brightness-105 disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <CheckCircle className="h-3 w-3" /> : error ? "!" : "Save"}
      </button>
    </div>
  );
}
