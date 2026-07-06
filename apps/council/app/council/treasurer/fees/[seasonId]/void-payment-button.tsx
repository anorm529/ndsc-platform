"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

export function VoidPaymentButton({
  paymentId,
  paymentMethod,
  amount,
}: {
  paymentId: string;
  paymentMethod: string;
  amount: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");

  async function handleVoid() {
    const isStripe = paymentMethod === "stripe";
    const promptMsg = isStripe
      ? `Enter void reason for this £${amount} Stripe payment.\n\nNote: voiding removes it from the balance only — no refund is issued in Stripe. Process the refund there separately.\n\nReason:`
      : `Enter void reason for this £${amount} payment:`;

    const reason = window.prompt(promptMsg);
    if (!reason?.trim()) return;

    setState("loading");
    const res = await fetch(`/api/fees/payment/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (res.ok) router.refresh();
    else setState("idle");
  }

  return (
    <button
      type="button"
      onClick={handleVoid}
      disabled={state === "loading"}
      title="Void this payment"
      className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[0.65rem] text-[color:var(--muted-foreground)] hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-40 transition-colors"
    >
      {state === "loading" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
      Void
    </button>
  );
}
