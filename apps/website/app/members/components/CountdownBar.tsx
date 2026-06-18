"use client";

import { useEffect, useMemo, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Kick-off time";

  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const dd = days > 0 ? `${days}d ` : "";
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${dd}${hh}h ${mm}m ${ss}s`;
}

export default function CountdownBar({
  targetISO,
  // Optional: what window should the progress bar represent?
  // Example: 7 days before kick-off. If you omit it, bar shows only countdown (no progress).
  progressWindowHours = 168, // 7 days
}: {
  targetISO: string;
  progressWindowHours?: number;
}) {
  const targetMs = useMemo(() => Date.parse(targetISO), [targetISO]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = targetMs - nowMs;

  // Progress window: starts X hours before target
  const windowMs = progressWindowHours * 60 * 60 * 1000;
  const startMs = targetMs - windowMs;

  const progress = useMemo(() => {
    if (!Number.isFinite(targetMs)) return 0;
    const p = (nowMs - startMs) / (targetMs - startMs);
    return clamp(p, 0, 1);
  }, [nowMs, startMs, targetMs]);

  if (!Number.isFinite(targetMs)) {
    return (
      <div className="mt-3 text-xs text-slate-400">
        Countdown unavailable (bad date format)
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>Kick-off in</span>
        <span className="font-semibold text-teal-400">{formatCountdown(remaining)}</span>
      </div>

      <div className="h-4 w-full rounded-full bg-white/10 overflow-hidden">
        <div
        className="h-full bg-teal-400 transition-all duration-500"
        style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="text-[11px] text-slate-500">
        Progress shows the last {Math.round(progressWindowHours / 24)} days leading up to the fixture.
      </div>
    </div>
  );
}
