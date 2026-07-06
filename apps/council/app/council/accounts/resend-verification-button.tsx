"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Check } from "lucide-react";

export function ResendVerificationButton({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function handle() {
    if (state === "busy") return;
    setState("busy");
    const res = await fetch("/api/accounts/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setState(res.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-[color:var(--success)]">
        <Check className="h-3.5 w-3.5" />
        Email sent
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={state === "busy"}
      className="flex items-center gap-1.5 rounded-lg bg-[rgba(233,185,62,0.1)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--warning)] hover:bg-[rgba(233,185,62,0.18)] disabled:opacity-50"
    >
      {state === "busy"
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <RefreshCw className="h-3.5 w-3.5" />
      }
      {state === "error" ? "Retry send" : "Resend verification"}
    </button>
  );
}
