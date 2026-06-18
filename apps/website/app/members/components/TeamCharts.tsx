"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type Row = {
  name: string;
  ops: number;
  avg: number;
  obp: number;
  slg: number;
  ab: number;
  hr: number;

  // optional extras for other tabs later
  bb?: number;
  hits?: number;
  rbi?: number;
  runs?: number;
  uao?: number;
  ao?: number;
  outs?: number;
};

type TeamAvg = { ops: number | null; avg: number | null; obp: number | null; slg: number | null };

// --- Grouping (keeps colours consistent without value judgements) ---
type Tier = "Teal group" | "Blue group" | "Purple group";

const TIER_COLORS: Record<Tier, string> = {
  "Teal group": "#2DD4BF",
  "Blue group": "#60A5FA",
  "Purple group": "#A78BFA",
};

function getTier(row: Row, teamAvg: TeamAvg): Tier {
  const t = teamAvg.ops;
  if (t == null) return "Blue group";

  // tweak these if you want
  if (row.ops >= t + 0.150) return "Teal group";
  if (row.ops >= t) return "Blue group";
  return "Purple group";
}

// Tooltip that actually tells you the player name
function ScatterTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Row & { tier?: Tier };
  return (
    <div className="rounded-xl border border-slate-600 bg-[#1D2E48] px-3 py-2 text-xs text-white shadow-xl">
      <div className="font-semibold">{d.name}</div>
      <div className="mt-1 text-slate-200">
        OBP: {Number(d.obp).toFixed(3)} • SLG: {Number(d.slg).toFixed(3)} • AB: {Math.round(d.ab)}
      </div>
      <div className="text-slate-200">OPS: {Number(d.ops).toFixed(3)}</div>
    </div>
  );
}

// Legend that matches our tiers
function TierLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
      {(Object.keys(TIER_COLORS) as Tier[]).map((t) => (
        <div key={t} className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: TIER_COLORS[t] }}
          />
          {t}
        </div>
      ))}
    </div>
  );
}

export default function TeamCharts({
  rows,
  teamAvg,
}: {
  rows: Row[];
  teamAvg: TeamAvg;
}) {
  const rowsWithTier = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        tier: getTier(r, teamAvg),
      })),
    [rows, teamAvg]
  );

  const elite = rowsWithTier.filter((r) => r.tier === "Teal group");
  const above = rowsWithTier.filter((r) => r.tier === "Blue group");
  const dev = rowsWithTier.filter((r) => r.tier === "Purple group");

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {/* OPS leaderboard */}
      <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
        <div className="text-white font-semibold">OPS by player</div>
        <div className="text-xs text-slate-400 mt-1">Line = team average OPS</div>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
              <Tooltip />
              {teamAvg.ops != null ? (
                <ReferenceLine y={teamAvg.ops} stroke="rgba(45,212,191,0.7)" strokeDasharray="6 6" />
              ) : null}
              <Bar dataKey="ops" fill="rgba(45,212,191,0.65)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* OBP vs SLG scatter (colour‑grouped, no labels) */}
      <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
        <div>
          <div className="text-white font-semibold">Player profiles</div>
          <div className="text-xs text-slate-400 mt-1">OBP (x) vs SLG (y), size = AB</div>
        </div>

        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                type="number"
                dataKey="obp"
                name="OBP"
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="slg"
                name="SLG"
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="ab" range={[60, 260]} name="AB" />

              <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: "3 3" }} />

              {/* three scatters = built-in legend grouping + clear colours */}
              <Scatter name="Teal group" data={elite} fill={TIER_COLORS["Teal group"]} />
              <Scatter name="Blue group" data={above} fill={TIER_COLORS["Blue group"]} />
              <Scatter name="Purple group" data={dev} fill={TIER_COLORS["Purple group"]} />

              {/* no textual legend – colours only */}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
