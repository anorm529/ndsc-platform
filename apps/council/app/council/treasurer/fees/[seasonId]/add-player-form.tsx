"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import type { PlayerRow } from "@/lib/main-db";
import type { PlayerProfile } from "@/lib/council-queries";
import type { FeeType, FeeSeason } from "@/lib/treasurer-queries";

type Props = {
  season: FeeSeason;
  unenrolled: (PlayerRow & { profile: PlayerProfile | null })[];
};

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  player: "Player",
  rookie: "Rookie",
  umpire: "Umpire (free)",
  custom: "Custom",
};

function suggestFeeType(profile: PlayerProfile | null): FeeType {
  if (profile?.isUmpire) return "umpire";
  if (profile?.isRookie) return "rookie";
  return "player";
}

function feeForType(season: FeeSeason, type: FeeType): number {
  if (type === "player") return season.playerFee;
  if (type === "rookie") return season.rookieFee;
  if (type === "umpire") return season.umpireFee;
  return 0;
}

export function AddPlayerForm({ season, unenrolled }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [feeType, setFeeType] = useState<FeeType>("player");
  const [amount, setAmount] = useState(season.playerFee.toFixed(2));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const selectedPlayer = unenrolled.find((p) => p.playerId === selectedId) ?? null;

  // When player changes, auto-suggest fee type and amount
  useEffect(() => {
    if (!selectedPlayer) return;
    const suggested = suggestFeeType(selectedPlayer.profile);
    setFeeType(suggested);
    if (suggested !== "custom") {
      setAmount(feeForType(season, suggested).toFixed(2));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When fee type changes, update amount (unless custom)
  useEffect(() => {
    if (feeType !== "custom") {
      setAmount(feeForType(season, feeType).toFixed(2));
    }
  }, [feeType]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer || !selectedPlayer.userId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer.playerId,
          userId: selectedPlayer.userId ?? null,
          playerName: selectedPlayer.registrationName || selectedPlayer.displayName || selectedPlayer.email || "Unknown",
          seasonId: season.id,
          feeType,
          amountDue: parseFloat(amount),
        }),
      });
      if (!res.ok) throw new Error();
      setSelectedId("");
      setFeeType("player");
      setAmount(season.playerFee.toFixed(2));
      setOpen(false);
      router.refresh();
    } catch {
      // keep form open
    } finally {
      setSaving(false);
    }
  }

  if (unenrolled.length === 0) {
    return (
      <section className="council-panel rounded-2xl border p-5">
        <div className="flex items-center gap-2 text-[0.88rem] font-semibold text-slate-800">
          <Plus className="h-4 w-4 text-[color:var(--accent)]" />
          Add player to season
        </div>
        <p className="mt-2 text-[0.8rem] text-[color:var(--muted-foreground)]">
          All active members are already enrolled in this season.
        </p>
      </section>
    );
  }

  return (
    <section className="council-panel rounded-2xl border p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-[0.88rem] font-semibold text-slate-800"
      >
        <Plus className="h-4 w-4 text-[color:var(--accent)]" />
        Add player to season
        <span className="ml-auto text-[0.72rem] font-normal text-[color:var(--muted-foreground)]">
          {unenrolled.length} not yet enrolled
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* Player select */}
          <div>
            <label className="mb-1 block text-[0.75rem] font-medium text-[color:var(--muted-foreground)]">Player</label>
            <select
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none focus:border-[color:var(--border-strong)]"
            >
              <option value="">Select player…</option>
              {unenrolled.map((p) => {
                const name = p.registrationName || p.displayName || p.email || "Unknown";
                const hint = p.profile?.isUmpire ? " · Umpire" : p.profile?.isRookie ? " · Rookie" : "";
                const loginHint = !p.userId ? " · no login" : "";
                return (
                  <option key={p.playerId} value={p.playerId}>
                    {name}{hint}{loginHint}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Fee type + amount */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[0.75rem] font-medium text-[color:var(--muted-foreground)]">Fee type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["player", "rookie", "umpire", "custom"] as FeeType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFeeType(t)}
                    className={[
                      "rounded-lg border px-3 py-2 text-[0.78rem] font-medium transition-colors",
                      feeType === t
                        ? "border-[color:var(--accent)] bg-[rgba(20,184,166,0.08)] text-[color:var(--accent)]"
                        : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:border-slate-300",
                    ].join(" ")}
                  >
                    {FEE_TYPE_LABELS[t]}
                    {t !== "custom" && (
                      <span className="ml-1 opacity-60">
                        £{feeForType(season, t).toFixed(0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[0.75rem] font-medium text-[color:var(--muted-foreground)]">Amount due (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                readOnly={feeType !== "custom"}
                onChange={(e) => setAmount(e.target.value)}
                className={[
                  "w-full rounded-xl border px-3 py-2.5 text-[0.85rem] text-slate-800 outline-none",
                  feeType === "custom"
                    ? "border-[color:var(--border)] bg-white focus:border-[color:var(--border-strong)]"
                    : "border-[color:var(--border)] bg-slate-50 text-slate-500",
                ].join(" ")}
              />
              {feeType !== "custom" && (
                <p className="mt-1 text-[0.68rem] text-[color:var(--muted-foreground)]">
                  Set by season rate · switch to Custom to override
                </p>
              )}
            </div>
          </div>

          {/* Profile hint */}
          {selectedPlayer?.profile && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-500">
              Profile:
              {selectedPlayer.profile.isUmpire && <span className="font-medium text-blue-600">Umpire → £0</span>}
              {selectedPlayer.profile.isRookie && !selectedPlayer.profile.isUmpire && <span className="font-medium text-amber-600">Rookie → £{season.rookieFee}</span>}
              {!selectedPlayer.profile.isRookie && !selectedPlayer.profile.isUmpire && <span>Standard player → £{season.playerFee}</span>}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[color:var(--border)] px-4 py-2.5 text-[0.85rem] text-[color:var(--muted-foreground)] hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedId}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] py-2.5 text-[0.85rem] font-medium text-white hover:brightness-105 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add to season
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
