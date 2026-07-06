"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus, UserPlus } from "lucide-react";

export function ToggleActiveButton({ playerId, isActive }: { playerId: string; isActive: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handle() {
    const msg = isActive
      ? "Deactivate this player? They will be hidden from the members list and cannot be enrolled in future seasons."
      : "Re-activate this player?";
    if (!confirm(msg)) return;
    setBusy(true);
    await fetch(`/api/players/${playerId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !isActive }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className={[
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] font-medium transition disabled:opacity-50",
        isActive
          ? "bg-[rgba(239,68,68,0.08)] text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)]"
          : "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)] hover:bg-[rgba(16,185,129,0.18)]",
      ].join(" ")}
    >
      {busy
        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
        : isActive
          ? <UserMinus className="h-2.5 w-2.5" />
          : <UserPlus className="h-2.5 w-2.5" />
      }
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
