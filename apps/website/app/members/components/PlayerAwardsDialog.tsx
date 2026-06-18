"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  groupAwardsByYear,
  type PlayerAward,
} from "@/app/members/lib/playerAwards";

export default function PlayerAwardsDialog({
  open,
  playerName,
  awards,
  onClose,
}: {
  open: boolean;
  playerName: string;
  awards: PlayerAward[];
  onClose: () => void;
}) {
  const headingId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const awardsByYear = useMemo(() => groupAwardsByYear(awards), [awards]);

  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={`Close awards for ${playerName}`}
        className="absolute inset-0 bg-[#040915]/75 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-600 bg-[#0D172D] shadow-2xl"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close awards modal"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-700/40 text-slate-200 transition hover:bg-slate-700/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
        >
          X
        </button>

        <div className="border-b border-[#2B4162] px-5 py-4 pr-12">
          <h3 id={headingId} className="text-lg font-semibold text-white">
            {playerName}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-amber-200/80">
            Awards &amp; Honours
          </p>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-4">
          {awardsByYear.map((yearBucket) => (
            <div key={yearBucket.year}>
              <div className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                {yearBucket.year}
              </div>
              <ul className="mt-2 space-y-1.5">
                {yearBucket.awards.map((entry) => (
                  <li
                    key={`${yearBucket.year}-${entry.award}-${entry.team ?? "no-team"}`}
                    className="text-sm text-slate-100"
                  >
                    {entry.award}
                    {entry.team ? (
                      <span className="ml-2 text-xs uppercase tracking-wide text-slate-400">
                        ({entry.team})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
