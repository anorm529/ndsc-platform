"use client";

import { useState } from "react";
import { Loader2, UserCheck, UserX, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PendingAccount } from "@/lib/account-queries";

interface Props {
  account: PendingAccount;
  mode: "approve-deny" | "link-then-approve";
}

export function AccountActions({ account, mode }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>(
    account.suggestions[0]?.playerId ?? ""
  );

  async function handleApprove() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/accounts/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: account.id, action: "approve" }),
    });
    router.refresh();
  }

  async function handleDeny() {
    if (busy || !confirm("Deny this account? This will disable it.")) return;
    setBusy(true);
    await fetch("/api/accounts/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: account.id, action: "deny" }),
    });
    router.refresh();
  }

  async function handleLinkAndApprove() {
    if (busy || !selectedPlayer) return;
    setBusy(true);
    await fetch("/api/accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: account.id, playerId: selectedPlayer }),
    });
    await fetch("/api/accounts/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: account.id, action: "approve" }),
    });
    router.refresh();
  }

  if (mode === "link-then-approve") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="flex-1 rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 text-[0.82rem] text-slate-800 outline-none"
          >
            <option value="">— select player —</option>
            {account.suggestions.map((s) => (
              <option key={s.playerId} value={s.playerId}>
                {s.displayName} {s.gender ? `(${s.gender[0].toUpperCase()})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLinkAndApprove}
            disabled={busy || !selectedPlayer}
            className="flex items-center gap-1.5 rounded-lg bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-3 py-2 text-[0.8rem] font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Link &amp; approve
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-[rgba(20,184,166,0.1)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.2)] disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Approve without link
          </button>
          <button
            type="button"
            onClick={handleDeny}
            disabled={busy}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-50"
          >
            <UserX className="h-3.5 w-3.5" />
            Deny
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleApprove}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-[rgba(20,184,166,0.1)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.2)] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
        Approve
      </button>
      <button
        type="button"
        onClick={handleDeny}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-50"
      >
        <UserX className="h-3.5 w-3.5" />
        Deny
      </button>
    </div>
  );
}
