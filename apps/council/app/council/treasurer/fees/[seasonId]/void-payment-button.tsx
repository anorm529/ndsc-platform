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
    const confirmMsg = isStripe
      ? `Void this £${amount} Stripe payment? The payment record will be removed but no refund will be issued in Stripe — process the refund separately in your Stripe dashboard.`
      : `Void this £${amount} payment? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;
    setState("loading");
    const res = await fetch(`/api/fees/payment/${paymentId}`, { method: "DELETE" });
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
