"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export function BulkSendButton({ seasonId, unpaidCount }: { seasonId: string; unpaidCount: number }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState<{ sent: number; skipped: number; errors: string[] } | null>(null);

  async function handleSend() {
    if (state === "sending" || unpaidCount === 0) return;
    setState("sending");
    try {
      const res = await fetch("/api/fees/remind/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, type: "initial" }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[0.78rem]">
        <span className="flex items-center gap-1 text-[color:var(--success)]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Sent to {result.sent} player{result.sent !== 1 ? "s" : ""}
        </span>
        {result.skipped > 0 && (
          <span className="text-[color:var(--muted-foreground)]">· {result.skipped} skipped (no account)</span>
        )}
        {result.errors.length > 0 && (
          <span className="text-[color:var(--danger)]">· {result.errors.length} failed</span>
        )}
      </div>
    );
  }

  if (state === "error") {
    return <span className="text-[0.78rem] text-[color:var(--danger)]">Failed to send — try again</span>;
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={state === "sending" || unpaidCount === 0}
      className="flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-medium text-white hover:brightness-105 disabled:opacity-50"
    >
      {state === "sending" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending…
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" />
          Send initial notice to all ({unpaidCount})
        </>
      )}
    </button>
  );
}
