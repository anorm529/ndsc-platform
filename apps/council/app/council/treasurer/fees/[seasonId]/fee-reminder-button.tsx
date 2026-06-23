"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";

type ReminderType = "initial" | "reminder" | "overdue";
type SendState = "idle" | "sending" | "sent" | "error";

const TYPES: Array<{
  type: ReminderType;
  label: string;
  sentLabel: string;
  className: string;
}> = [
  {
    type: "initial",
    label: "Send notice",
    sentLabel: "Notice sent",
    className: "bg-[rgba(20,184,166,0.08)] text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.16)]",
  },
  {
    type: "reminder",
    label: "Remind",
    sentLabel: "Reminder sent",
    className: "bg-[rgba(233,185,62,0.1)] text-[color:var(--warning)] hover:bg-[rgba(233,185,62,0.18)]",
  },
  {
    type: "overdue",
    label: "Overdue notice",
    sentLabel: "Overdue notice sent",
    className: "bg-[rgba(239,68,68,0.08)] text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)]",
  },
];

export function FeeReminderButton({ playerFeeId, playerName }: { playerFeeId: string; playerName: string }) {
  const [sending, setSending] = useState<ReminderType | null>(null);
  const [sent, setSent] = useState<ReminderType | null>(null);
  const [error, setError] = useState("");

  async function handleSend(type: ReminderType) {
    if (sending) return;
    setSending(type);
    setError("");

    const res = await fetch("/api/fees/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerFeeId, type }),
    });
    const data = await res.json();

    setSending(null);
    if (res.ok) {
      setSent(type);
    } else {
      setError(data.error ?? "Failed to send");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TYPES.map(({ type, label, sentLabel, className }) => {
        const isSending = sending === type;
        const isSent = sent === type;

        if (isSent) {
          return (
            <span key={type} className="flex items-center gap-1 text-[0.7rem] text-[color:var(--success)]">
              <CheckCircle className="h-3 w-3" />
              {sentLabel}
            </span>
          );
        }

        return (
          <button
            key={type}
            type="button"
            onClick={() => handleSend(type)}
            disabled={!!sending}
            title={`${label} to ${playerName}`}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[0.7rem] font-medium transition disabled:opacity-50 ${className}`}
          >
            {isSending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Mail className="h-2.5 w-2.5" />}
            {label}
          </button>
        );
      })}
      {error && <span className="text-[0.7rem] text-[color:var(--danger)]">{error}</span>}
    </div>
  );
}
