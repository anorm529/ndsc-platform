"use client";

import { useState } from "react";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  teamName: string;
  count: number;
  highlight: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleTeamCard({
  teamName,
  count,
  highlight,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={[
      "council-panel rounded-2xl border overflow-hidden",
      highlight ? "border-[color:var(--accent)] ring-1 ring-[color:var(--accent)] ring-opacity-20" : "",
    ].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <Shield className={`h-4 w-4 shrink-0 ${highlight ? "text-[color:var(--accent)]" : "text-slate-400"}`} />
        <h3 className="text-[0.92rem] font-semibold text-slate-800">{teamName}</h3>
        {highlight && (
          <span className="rounded-full bg-[rgba(20,184,166,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--accent)]">
            Your team
          </span>
        )}
        <span className={[
          "ml-auto rounded-full px-2 py-0.5 text-[0.7rem]",
          highlight
            ? "bg-[rgba(20,184,166,0.08)] text-[color:var(--accent)]"
            : "bg-slate-100 text-[color:var(--muted-foreground)]",
        ].join(" ")}>
          {count} {count === 1 ? "player" : "players"}
        </span>
        <span className="ml-2 text-[color:var(--muted-foreground)]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-[color:var(--border)] px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}
