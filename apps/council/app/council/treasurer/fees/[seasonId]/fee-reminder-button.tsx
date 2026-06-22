"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export function FeeReminderButton({ playerFeeId, playerName }: { playerFeeId: string; playerName: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleRemind() {
    if (state === "sending" || state === "sent") return;
    setState("sending");

    const res = await fetch("/api/fees/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerFeeId }),
    });
    const data = await res.json();

    if (res.ok) {
      setState("sent");
    } else {
      setError(data.error ?? "Failed to send");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <span className="flex items-center gap-1 text-[0.72rem] text-[color:var(--success)]">
        <CheckCircle className="h-3 w-3" />
        Reminder sent
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRemind}
        disabled={state === "sending"}
        title={`Send fee reminder to ${playerName}`}
        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[0.72rem] font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        {state === "sending" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Mail className="h-3 w-3" />
        )}
        Remind
      </button>
      {state === "error" && (
        <span className="text-[0.7rem] text-[color:var(--danger)]">{error}</span>
      )}
    </div>
  );
}
