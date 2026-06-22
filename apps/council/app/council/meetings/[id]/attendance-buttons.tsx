"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceStatus } from "@/lib/council-queries";

interface Props {
  meetingId: string;
  userId: string;
  current: AttendanceStatus | null;
}

const OPTIONS: { value: AttendanceStatus | null; label: string; active: string; inactive: string }[] = [
  { value: "present",   label: "P", active: "bg-[rgba(16,185,129,0.2)] text-[color:var(--success)] ring-1 ring-[color:var(--success)]", inactive: "bg-slate-100 text-slate-400 hover:bg-slate-200" },
  { value: "absent",    label: "A", active: "bg-[rgba(239,68,68,0.2)] text-[color:var(--danger)] ring-1 ring-[color:var(--danger)]",     inactive: "bg-slate-100 text-slate-400 hover:bg-slate-200" },
  { value: "apologies", label: "~", active: "bg-[rgba(233,185,62,0.2)] text-[color:var(--warning)] ring-1 ring-[color:var(--warning)]",   inactive: "bg-slate-100 text-slate-400 hover:bg-slate-200" },
];

const TITLES: Record<string, string> = {
  present: "Mark present",
  absent: "Mark absent",
  apologies: "Mark apologies",
};

export function AttendanceButtons({ meetingId, userId, current }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function mark(status: AttendanceStatus | null) {
    if (saving) return;
    // Toggle off if already selected
    const next = status === current ? null : status;
    setSaving(true);
    await fetch(`/api/meetings/${meetingId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      {OPTIONS.map(({ value, label, active, inactive }) => (
        <button
          key={value ?? "none"}
          type="button"
          title={value ? TITLES[value] : "Clear"}
          onClick={() => mark(value)}
          disabled={saving}
          className={[
            "h-6 w-6 rounded-md text-[0.7rem] font-bold transition-colors disabled:opacity-50",
            current === value ? active : inactive,
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
