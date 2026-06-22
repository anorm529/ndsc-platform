"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  icon: React.ReactNode;
  year: number;
  label: string;
  count: number;
  countLabel: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleYearCard({
  icon,
  year,
  label,
  count,
  countLabel,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="council-panel rounded-2xl border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        {icon}
        <h3 className="text-[0.92rem] font-semibold text-slate-800">
          {year} {label}
        </h3>
        <span className="ml-2 text-[0.72rem] text-[color:var(--muted-foreground)]">
          {count} {countLabel}
        </span>
        <span className="ml-auto text-[color:var(--muted-foreground)]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-[color:var(--border)] px-5 pb-5 pt-4 space-y-4">
          {children}
        </div>
      )}
    </section>
  );
}
