"use client";

import { useMemo, useState } from "react";
import type { Match } from "@/lib/ndsc-data";

type Filter = "all" | "completed" | "upcoming";

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

function parseDate(value: unknown) {
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function resultClass(result?: string | null) {
  const r = String(result || "").toUpperCase();
  if (r === "W") return "border-teal-300/25 bg-teal-500/15 text-teal-400";
  if (r === "L") return "border-rose-300/25 bg-rose-500/15 text-rose-200";
  if (r === "D") return "border-amber-300/25 bg-amber-500/15 text-amber-200";
  return "border-[#2B4162] bg-[#1D2E48] text-slate-400";
}

function formatDate(date: string) {
  const parsed = parseDate(date);
  if (!Number.isFinite(parsed)) return "-";
  return new Date(parsed).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatScore(match: Match) {
  if (typeof match.runsFor === "number" && typeof match.runsAgainst === "number") {
    return `${match.runsFor}-${match.runsAgainst}`;
  }
  return "-";
}

function MatchRow({ match }: { match: Match }) {
  const completed = !isBlank(match.result);
  const result = completed ? String(match.result).toUpperCase() : "FIX";

  return (
    <div className="grid gap-3 rounded-xl border border-[#2B4162] bg-slate-700/30 px-4 py-4 text-sm text-white md:grid-cols-[150px_1fr_110px_100px] md:items-center">
      <div className="text-slate-300">{formatDate(match.date)}</div>
      <div className="min-w-0">
        <div className="font-medium text-white">vs {match.opponent || "-"}</div>
        <div className="mt-1 text-xs text-slate-500">
          {[match.homeAway, match.location].filter(Boolean).join(" • ") || "-"}
        </div>
      </div>
      <div className="text-slate-200 md:text-right">{formatScore(match)}</div>
      <div className="md:text-right">
        <span className={cn("inline-flex min-w-12 justify-center rounded-lg border px-2 py-1 text-xs font-semibold", resultClass(match.result))}>
          {result}
        </span>
      </div>
    </div>
  );
}

export default function MatchHistory({ matches }: { matches: Match[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    return matches.reduce(
      (acc, match) => {
        if (isBlank(match.result)) acc.upcoming += 1;
        else acc.completed += 1;
        return acc;
      },
      { completed: 0, upcoming: 0 }
    );
  }, [matches]);

  const visible = useMemo(() => {
    return matches
      .filter((match) => {
        if (filter === "completed") return !isBlank(match.result);
        if (filter === "upcoming") return isBlank(match.result);
        return true;
      })
      .slice()
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }, [filter, matches]);

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: `All ${matches.length}` },
    { key: "completed", label: `Completed ${counts.completed}` },
    { key: "upcoming", label: `Upcoming ${counts.upcoming}` },
  ];

  return (
    <section id="matches" className="mt-10 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Match history</h2>
          <p className="mt-1 text-sm text-slate-400">Fixtures and completed results for this team.</p>
        </div>

        <div className="inline-flex rounded-2xl border border-[#2B4162] bg-slate-700/40 p-1">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm",
                filter === item.key
                  ? "border border-teal-300/30 bg-teal-500/15 text-teal-400"
                  : "text-slate-300 hover:bg-slate-700/50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {visible.map((match, index) => (
          <MatchRow key={`${match.date}-${match.opponent}-${index}`} match={match} />
        ))}

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5 text-sm text-slate-300">
            No matches found for this filter.
          </div>
        ) : null}
      </div>
    </section>
  );
}
