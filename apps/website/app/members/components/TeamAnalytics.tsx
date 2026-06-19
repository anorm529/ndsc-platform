"use client";

import { useMemo, useState } from "react";
import TeamCharts from "./TeamCharts";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Row = {
  name: string;
  gender?: string;

  // offence rates
  ops: number;
  avg: number;
  obp: number;
  slg: number;

  // offence counting
  ab: number;
  hr: number;
  bb?: number;
  rbi?: number;
  runs?: number;
  hits?: number;
  gp?: number;

  // fielding (needed for fielding tab)
  uao?: number;
  ao?: number;
  outs?: number;
  innings?: number;
};

type TeamAvg = { ops: number | null; avg: number | null; obp: number | null; slg: number | null };

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function fmt3(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(3);
}
function fmt0(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toString();
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function DeltaPill({ label, value }: { label: string; value: number | null }) {
  const v = value;
  const good = v != null && v >= 0;
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#2B4162] bg-slate-700/30 px-4 py-3">
      <div className="text-sm text-slate-300">{label}</div>
      <div
        className={cn(
          "text-sm font-semibold",
          v == null ? "text-slate-500" : good ? "text-teal-300" : "text-rose-300"
        )}
      >
        {v == null ? "—" : `${good ? "+" : ""}${v.toFixed(3)}`}
      </div>
    </div>
  );
}

function delta(a: number | null, b: number | null) {
  if (a == null || b == null) return null;
  const d = a - b;
  return Number.isFinite(d) ? d : null;
}

type AnalyticsTab = "offence" | "discipline" | "fielding";

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function Tip({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-sm text-slate-400">{children}</div>;
}

const isMale = (g?: string) => (g ?? "").toLowerCase() === "male";
const isFemale = (g?: string) => (g ?? "").toLowerCase() === "female";

export default function TeamAnalytics({
  rows,
  teamAvg,
  seasonLabel,
}: {
  rows: Row[];
  teamAvg: TeamAvg;
  seasonLabel?: string;
}) {
  const [tab, setTab] = useState<AnalyticsTab>("offence");
  const [selectedName, setSelectedName] = useState<string>(rows[0]?.name ?? "");

  const selected = useMemo(
    () => rows.find((r) => r.name === selectedName) ?? null,
    [rows, selectedName]
  );

  const totals = useMemo(() => {
    const sum = (key: keyof Row) => rows.reduce((acc, r) => acc + num(r[key]), 0);
    return {
      ab: sum("ab"),
      hr: sum("hr"),
      runs: sum("runs"),
      rbi: sum("rbi"),
      bb: sum("bb"),
      hits: sum("hits"),
      gp: sum("gp"),
      outs: sum("outs"),
      innings: sum("innings"),
    };
  }, [rows]);

  // Discipline computed rows
  const disciplineRows = useMemo(() => {
    return rows.map((r) => {
      const ab = Math.max(0, num(r.ab));
      const bb = Math.max(0, num(r.bb));
      const bbRate = ab > 0 ? bb / ab : 0;
      const hits = Math.max(0, num(r.hits));
      // "on base events" proxy (walks + hits) since we don’t have HBP etc.
      const onBaseEvents = bb + hits;

      return { ...r, bb, bbRate, hits, onBaseEvents };
    });
  }, [rows]);

  // Fielding computed rows
  const fieldingRows = useMemo(() => {
    return rows.map((r) => {
      const outs = Math.max(0, num(r.outs));
      const inn = Math.max(0, num(r.innings));
      const outsPerInning = inn > 0 ? outs / inn : 0;

      const uao = Math.max(0, num(r.uao));
      const ao = Math.max(0, num(r.ao));

      return { ...r, outs, inn, outsPerInning, uao, ao };
    });
  }, [rows]);

  // for charts: keep labels from going mental
  const shortName = (s: string) => (s.length > 12 ? s.slice(0, 12) + "…" : s);

  return (
    <section className="mt-10">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <p className="mt-1 text-sm text-slate-400">
            {seasonLabel ? `Filtered: ${seasonLabel}` : "Filtered: All seasons"} • Players:{" "}
            {rows.length}
          </p>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-2xl border border-[#2B4162] bg-slate-700/40 p-1">
          {[
            { key: "offence", label: "Offence" },
            { key: "discipline", label: "Discipline" },
            { key: "fielding", label: "Fielding" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as AnalyticsTab)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                tab === t.key
                  ? "bg-teal-500/15 text-teal-400 border border-teal-300/30"
                  : "text-slate-300 hover:bg-slate-700/50"
              )}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Player selector */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400">Spotlight</div>
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="rounded-xl border border-slate-600 bg-[#1D2E48] px-3 py-2 text-sm text-white outline-none"
          >
            {rows.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI row (always visible) */}
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <StatCard label="Team OPS (avg)" value={fmt3(teamAvg.ops)} sub="Average OPS across players" />
        <StatCard label="Team OBP (avg)" value={fmt3(teamAvg.obp)} />
        <StatCard label="Team SLG (avg)" value={fmt3(teamAvg.slg)} />
        <StatCard label="Total AB" value={fmt0(totals.ab)} sub="Sum of AB (current filter)" />
      </div>

      {/* ========================= OFFENCE ========================= */}
      {tab === "offence" ? (
        <>
          <TeamCharts rows={rows} teamAvg={teamAvg} />

          {/* Spotlight */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">Player spotlight</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {selected ? selected.name : "—"} vs team average
                  </div>
                </div>
                <div className="text-xs text-slate-500">Updates with season buttons</div>
              </div>

              {selected ? (
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <StatCard label="OPS" value={fmt3(selected.ops)} sub={`Team: ${fmt3(teamAvg.ops)}`} />
                  <StatCard label="OBP" value={fmt3(selected.obp)} sub={`Team: ${fmt3(teamAvg.obp)}`} />
                  <StatCard label="AVG" value={fmt3(selected.avg)} sub={`AB: ${fmt0(selected.ab)}`} />
                  <StatCard label="SLG" value={fmt3(selected.slg)} sub={`HR: ${fmt0(selected.hr)}`} />
                </div>
              ) : (
                <div className="mt-5 text-sm text-slate-400">No player selected.</div>
              )}
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Delta vs team</div>
              <div className="mt-1 text-sm text-slate-400">Positive = above team average</div>

              <div className="mt-4 space-y-3">
                <DeltaPill label="OPS delta" value={selected ? delta(selected.ops, teamAvg.ops) : null} />
                <DeltaPill label="OBP delta" value={selected ? delta(selected.obp, teamAvg.obp) : null} />
                <DeltaPill label="AVG delta" value={selected ? delta(selected.avg, teamAvg.avg) : null} />
                <DeltaPill label="SLG delta" value={selected ? delta(selected.slg, teamAvg.slg) : null} />
              </div>
            </div>
          </div>

          {/* Leaders */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top OPS</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => b.ops - a.ops)
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-teal-300 font-semibold">{r.ops.toFixed(3)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => b.ops - a.ops)
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-teal-300 font-semibold">{r.ops.toFixed(3)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top OBP</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => b.obp - a.obp)
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-obp-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{r.obp.toFixed(3)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => b.obp - a.obp)
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-obp-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{r.obp.toFixed(3)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">HR leaders</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.hr || 0) - (a.hr || 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-hr-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.hr || 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {rows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.hr || 0) - (a.hr || 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-hr-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.hr || 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ========================= DISCIPLINE ========================= */}
      {tab === "discipline" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
            <div className="text-white font-semibold">Walk rate (BB/AB)</div>
            <Tip>Higher = more patient hitters. Uses BB and AB from your table.</Tip>

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={disciplineRows.slice().sort((a, b) => (b.bbRate ?? 0) - (a.bbRate ?? 0))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickFormatter={shortName}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                    formatter={(val, name) => {
                      if (name === "bbRate") return [(Number(val) || 0).toFixed(3), "BB/AB"];
                      return [String(val), String(name)];
                    }}
                  />
                  <Bar dataKey="bbRate" fill="rgba(96,165,250,0.75)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
            <div className="text-white font-semibold">On-base events (Hits + BB)</div>
            <Tip>Simple proxy for “getting on base” using what we currently track.</Tip>

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={disciplineRows.slice().sort((a, b) => (b.onBaseEvents ?? 0) - (a.onBaseEvents ?? 0))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickFormatter={shortName}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                  <Legend />
                  <Bar dataKey="hits" name="Hits" stackId="a" fill="rgba(45,212,191,0.65)" />
                  <Bar dataKey="bb" name="BB" stackId="a" fill="rgba(96,165,250,0.65)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaders */}
          <div className="lg:col-span-2 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top BB</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {disciplineRows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.bb ?? 0) - (a.bb ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-bb-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.bb ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {disciplineRows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.bb ?? 0) - (a.bb ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-bb-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.bb ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top BB/AB</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {disciplineRows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.bbRate ?? 0) - (a.bbRate ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-bbrate-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{(r.bbRate ?? 0).toFixed(3)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {disciplineRows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.bbRate ?? 0) - (a.bbRate ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-bbrate-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{(r.bbRate ?? 0).toFixed(3)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top On-base events</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {disciplineRows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.onBaseEvents ?? 0) - (a.onBaseEvents ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-obevents-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.onBaseEvents ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {disciplineRows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.onBaseEvents ?? 0) - (a.onBaseEvents ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-obevents-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.onBaseEvents ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================= FIELDING ========================= */}
      {tab === "fielding" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
            <div className="text-white font-semibold">Outs breakdown (UAO vs AO)</div>
            <Tip>Stacked bars: helps show how outs are being made.</Tip>

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fieldingRows.slice().sort((a, b) => (b.outs ?? 0) - (a.outs ?? 0))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickFormatter={shortName}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                  <Legend />
                  <Bar dataKey="uao" name="UAO" stackId="a" fill="rgba(167,139,250,0.65)" />
                  <Bar dataKey="ao" name="AO" stackId="a" fill="rgba(96,165,250,0.65)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
            <div className="text-white font-semibold">Outs per inning</div>
            <Tip>Simple efficiency: outs / innings (uses your innings field).</Tip>

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fieldingRows.slice().sort((a, b) => (b.outsPerInning ?? 0) - (a.outsPerInning ?? 0))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickFormatter={shortName}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                    formatter={(val) => [(Number(val) || 0).toFixed(2), "Outs/inning"]}
                  />
                  <Bar dataKey="outsPerInning" fill="rgba(45,212,191,0.65)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaders */}
          <div className="lg:col-span-2 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top OUTS</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {fieldingRows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.outs ?? 0) - (a.outs ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-outs-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.outs ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {fieldingRows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.outs ?? 0) - (a.outs ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-outs-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.outs ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top UAO</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {fieldingRows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.uao ?? 0) - (a.uao ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`m-uao-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.uao ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {fieldingRows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.uao ?? 0) - (a.uao ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div key={`f-uao-${r.name}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">{Math.round(r.uao ?? 0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="text-white font-semibold">Top Outs/inning</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top males</div>
                  <div className="space-y-2">
                    {fieldingRows
                      .filter((r) => isMale(r.gender))
                      .slice()
                      .sort((a, b) => (b.outsPerInning ?? 0) - (a.outsPerInning ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div
                          key={`m-outspi-${r.name}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">
                            {(r.outsPerInning ?? 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Top females</div>
                  <div className="space-y-2">
                    {fieldingRows
                      .filter((r) => isFemale(r.gender))
                      .slice()
                      .sort((a, b) => (b.outsPerInning ?? 0) - (a.outsPerInning ?? 0))
                      .slice(0, 5)
                      .map((r) => (
                        <div
                          key={`f-outspi-${r.name}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-200">{r.name}</span>
                          <span className="text-white font-semibold">
                            {(r.outsPerInning ?? 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
