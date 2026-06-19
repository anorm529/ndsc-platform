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
  const n = parseInt(String(y ?? "").trim(), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1000 || n > 3000) return null; // ignores things like "202"
  return n;
}

function clsx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function StandingsTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-[#2B4162] bg-slate-700/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B4162]">
        <div className="text-sm font-semibold text-slate-200">{title}</div>
        <div className="text-xs text-slate-500">{rows.length} teams</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/30 text-slate-300">
            <tr>
              <th className="text-left px-4 py-3">Pos</th>
              <th className="text-left px-4 py-3">Team</th>
              <th className="text-right px-4 py-3">Pts</th>
              <th className="text-right px-4 py-3">W</th>
              <th className="text-right px-4 py-3">L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isNDSC = NDSC_TEAMS.has(r.Team);
              return (
                <tr
                  key={`${r.Division}-${r.Team}-${r.Position}`}
                  className={clsx(
                    "border-t border-[#2B4162]",
                    isNDSC && "bg-teal-500/10"
                  )}
                >
                  <td className="px-4 py-3 text-slate-200">{r.Position}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx(isNDSC ? "text-teal-400 font-semibold" : "text-slate-100")}>
                        {r.Team}
                      </span>
                      {isNDSC && (
                        <span className="text-[10px] font-semibold tracking-widest px-2 py-1 rounded-full border border-teal-300/30 bg-teal-500/10 text-teal-400">
                          NDSC
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-200">{r.Points}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.Win}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.Loss}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeagueStandingsSection({ rows }: { rows: Row[] }) {
  const years = useMemo(() => {
    const ys = rows.map((r) => normalizeYear(r.Year)).filter((y): y is number => y !== null);
    return Array.from(new Set(ys)).sort((a, b) => b - a);
  }, [rows]);

  const [year, setYear] = useState<number | null>(years[0] ?? null);

  const filtered = useMemo(() => {
    return rows
      .map((r) => ({ ...r, _year: normalizeYear(r.Year) }))
      .filter((r) => (year === null ? true : r._year === year))
      .sort((a, b) => (Number(a.Position ?? 999) - Number(b.Position ?? 999)));
  }, [rows, year]);

  const divA = filtered.filter((r) => String(r.Division).toUpperCase() === "A");
  const divB = filtered.filter((r) => String(r.Division).toUpperCase() === "B");

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-white">League standings</h2>
        

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs font-semibold tracking-widest text-slate-400">YEAR</div>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={clsx(
                "rounded-xl px-4 py-2 text-sm font-semibold border transition",
                year === y
                  ? "bg-teal-400 text-[#0F172A] border-teal-300"
                  : "bg-[#1D2E48] text-white border-[#2B4162] hover:bg-slate-700"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Pulled from Softball Ulster Website.
      </div>

      <div className="mt-5 space-y-8">
        <StandingsTable title="Division A" rows={divA} />
        <StandingsTable title="Division B" rows={divB} />
      </div>
    </div>
  );
}
