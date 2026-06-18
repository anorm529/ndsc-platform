"use client";

import { useMemo, useState } from "react";

type Row = {
  Team: string;
  Position: number;
  Division: "A" | "B" | string;
  Points: number;
  Win: number;
  Loss: number;
  "Runs Scored"?: number;
  "Runs Awarded"?: number;
  Difference?: number;
  Streak?: string;
  Year: number | string;
};

const NDSC_TEAMS = new Set(["Barracudas", "Buccaneers", "Sluggers"]);

function normalizeYear(y: Row["Year"]): number | null {
  const s = String(y ?? "").trim();
  const n = parseInt(s, 10);

  // Handle weird values like "202" by rejecting non-4-digit years
  if (!Number.isFinite(n)) return null;
  if (n < 1000 || n > 3000) return null;
  return n;
}

function clsx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="text-sm font-semibold text-white/80">{title}</div>
        <div className="text-xs text-white/50">{rows.length} teams</div>
      </div>

      <div>
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-white/70">
            <tr>
              <th className="text-left px-6 py-3">Pos</th>
              <th className="text-left px-6 py-3">Team</th>
              <th className="text-right px-6 py-3">Pts</th>
              <th className="text-right px-6 py-3">W</th>
              <th className="text-right px-6 py-3">L</th>
              <th className="text-right px-6 py-3">RS</th>
              <th className="text-right px-6 py-3">RA</th>
              <th className="text-right px-6 py-3">Diff</th>
              <th className="text-right px-6 py-3">Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isNDSC = NDSC_TEAMS.has(r.Team);
              return (
                <tr
                  key={`${r.Division}-${r.Team}-${r.Position}`}
                  className={clsx(
                    "border-t border-white/10",
                    isNDSC && "bg-teal-500/10"
                  )}
                >
                  <td className="px-6 py-3 text-white/80">{r.Position}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx(isNDSC ? "text-teal-200 font-semibold" : "text-white/90")}>
                        {r.Team}
                      </span>
                      {isNDSC && (
                        <span className="text-[10px] font-semibold tracking-widest px-2 py-1 rounded-full border border-teal-300/30 bg-teal-500/10 text-teal-200">
                          NDSC
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-white/80">{r.Points}</td>
                  <td className="px-6 py-3 text-right text-white/70">{r.Win}</td>
                  <td className="px-6 py-3 text-right text-white/70">{r.Loss}</td>
                  <td className="px-6 py-3 text-right text-white/70">{r["Runs Scored"] ?? 0}</td>
                  <td className="px-6 py-3 text-right text-white/70">{r["Runs Awarded"] ?? 0}</td>
                  <td className={clsx("px-6 py-3 text-right", (r.Difference ?? 0) >= 0 ? "text-teal-200" : "text-red-300")}>
                    {r.Difference ?? 0}
                  </td>
                  <td className="px-6 py-3 text-right text-white/70">{r.Streak ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StandingsClient({ rows }: { rows: Row[] }) {
  const years = useMemo(() => {
    const ys = rows
      .map((r) => normalizeYear(r.Year))
      .filter((y): y is number => y !== null);
    return Array.from(new Set(ys)).sort((a, b) => b - a);
  }, [rows]);

  const [year, setYear] = useState<number | null>(years[0] ?? null);

  const filtered = useMemo(() => {
    const safe = rows
      .map((r) => ({ ...r, _year: normalizeYear(r.Year) }))
      .filter((r) => (year === null ? true : r._year === year));

    // sort by division then position
    safe.sort((a, b) => {
      if (a.Division !== b.Division) return a.Division.localeCompare(b.Division);
      return (a.Position ?? 999) - (b.Position ?? 999);
    });

    return safe as (Row & { _year: number | null })[];
  }, [rows, year]);

  const divA = filtered.filter((r) => r.Division === "A");
  const divB = filtered.filter((r) => r.Division === "B");

  return (
    <div className="space-y-8">
      {/* Year filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xs font-semibold tracking-widest text-white/60">
          YEAR
        </div>

        {years.length === 0 ? (
          <div className="text-sm text-white/70">No valid year values found.</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={clsx(
                  "rounded-xl px-4 py-2 text-sm font-semibold border transition",
                  year === y
                    ? "bg-teal-400 text-[#0B1324] border-teal-300"
                    : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tables */}
      <div className="space-y-10">
        <Table title="Division A" rows={divA as any} />
        <Table title="Division B" rows={divB as any} />
      </div>

      
    </div>
  );
}
