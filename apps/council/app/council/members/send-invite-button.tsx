"use client";

import { useState } from "react";
import { Loader2, Mail, Check } from "lucide-react";

export function SendInviteButton({ playerId }: { playerId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function handle() {
    if (state === "busy") return;
    setState("busy");
    const res = await fetch(`/api/players/${playerId}/invite`, { method: "POST" });
    setState(res.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <span className="flex items-center gap-1 text-[0.65rem] font-medium text-[color:var(--success)]">
        <Check className="h-2.5 w-2.5" />
        Sent
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={state === "busy"}
      title={state === "error" ? "Failed — click to retry" : "Send platform invite email"}
      className={[
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] font-medium transition disabled:opacity-50",
        state === "error"
          ? "bg-[rgba(239,68,68,0.08)] text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)]"
          : "bg-[rgba(115,145,176,0.08)] text-[color:var(--muted-foreground)] hover:bg-[rgba(115,145,176,0.15)] hover:text-slate-700",
      ].join(" ")}
    >
      {state === "busy"
        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
        : <Mail className="h-2.5 w-2.5" />
      }
      {state === "error" ? "Retry" : "Send invite"}
    </button>
  );
}
