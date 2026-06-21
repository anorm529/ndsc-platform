import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, PoundSterling, RefreshCcw } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getYearOnYearStats, type YearStats } from "@/lib/council-queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function currency(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Mini bar (CSS only) ──────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Gender split bar ─────────────────────────────────────────────────────────

function GenderBar({ female, male, total }: { female: number; male: number; total: number }) {
  const fPct = total > 0 ? (female / total) * 100 : 0;
  const mPct = total > 0 ? (male / total) * 100 : 0;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div style={{ width: `${fPct}%` }} className="bg-[#E84AA5]" />
      <div style={{ width: `${mPct}%` }} className="bg-[#1ED0D8]" />
    </div>
  );
}

// ─── Year card ────────────────────────────────────────────────────────────────

function YearCard({ stat, prevStat }: { stat: YearStats; prevStat: YearStats | null }) {
  const feeCollected = stat.totalDue > 0 ? (stat.totalPaid / stat.totalDue) * 100 : 0;
  const memberDelta = prevStat !== null ? stat.total - prevStat.total : null;
  const maxTeam = Math.max(...stat.teamBreakdown.map((t) => t.count), 1);

  return (
    <section className="council-panel rounded-2xl border p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.08)]">
            <span className="text-[0.82rem] font-bold text-[color:var(--accent)]">{stat.year}</span>
          </div>
          <div>
            <p className="text-[1.05rem] font-semibold text-slate-800">{stat.total} members</p>
            {memberDelta !== null && (
              <p className={`text-[0.72rem] font-medium ${memberDelta >= 0 ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}>
                {memberDelta >= 0 ? "+" : ""}{memberDelta} vs {stat.year - 1}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/council/archive/${stat.year}`}
          className="text-[0.75rem] text-[color:var(--accent)] hover:underline"
        >
          View roster →
        </Link>
      </div>

      {/* Gender bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[0.72rem]">
          <span className="font-medium text-[#E84AA5]">F {stat.female} ({pct(stat.female, stat.total)})</span>
          <span className="font-medium text-[#1ED0D8]">M {stat.male} ({pct(stat.male, stat.total)})</span>
        </div>
        <GenderBar female={stat.female} male={stat.male} total={stat.total} />
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Returners" value={stat.returners} sub={pct(stat.returners, stat.total)} color="text-[color:var(--accent)]" />
        <StatTile label="New players" value={stat.newPlayers} sub={pct(stat.newPlayers, stat.total)} color="text-slate-800" />
        <StatTile label="Rookies" value={stat.rookies} sub={pct(stat.rookies, stat.total)} color="text-amber-600" />
        <StatTile label="Umpires" value={stat.umpires} sub={pct(stat.umpires, stat.total)} color="text-blue-600" />
      </div>

      {/* Fees */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[0.72rem]">
          <span className="font-semibold text-slate-700">
            <PoundSterling className="inline h-3 w-3" /> Fees
          </span>
          <span className="text-[color:var(--muted-foreground)]">
            {currency(stat.totalPaid)} collected of {currency(stat.totalDue)} ({Math.round(feeCollected)}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[color:var(--success)]"
            style={{ width: `${Math.min(feeCollected, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex gap-4 text-[0.68rem] text-[color:var(--muted-foreground)]">
          <span className="text-[color:var(--success)]">✓ Paid: {stat.paid}</span>
          {stat.partial > 0 && <span className="text-[color:var(--warning)]">~ Partial: {stat.partial}</span>}
          {stat.unpaid > 0 && <span className="text-[color:var(--danger)]">✗ Unpaid: {stat.unpaid}</span>}
        </div>
      </div>

      {/* Team breakdown */}
      {stat.teamBreakdown.length > 0 && (
        <div>
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Teams
          </p>
          <div className="space-y-2">
            {stat.teamBreakdown.map((t) => (
              <div key={t.teamName}>
                <div className="mb-0.5 flex items-center justify-between text-[0.72rem]">
                  <span className="text-slate-700">{t.teamName}</span>
                  <span className="font-medium text-slate-800">{t.count} ({pct(t.count, stat.total)})</span>
                </div>
                <Bar value={t.count} max={maxTeam} color="bg-[color:var(--accent)]" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatTile({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] p-3 text-center">
      <p className={`text-[1.25rem] font-bold ${color}`}>{value}</p>
      <p className="text-[0.62rem] text-[color:var(--muted-foreground)]">{label}</p>
      <p className="text-[0.65rem] text-slate-500">{sub}</p>
    </div>
  );
}

// ─── Summary table ────────────────────────────────────────────────────────────

function SummaryTable({ stats }: { stats: YearStats[] }) {
  return (
    <section className="council-panel rounded-2xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[color:var(--accent)]" />
        <h3 className="text-[0.92rem] font-semibold text-slate-800">Year-on-year comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr className="border-b border-[color:var(--border)] text-left text-[0.66rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              <th className="pb-2 pr-4">Year</th>
              <th className="pb-2 pr-4">Total</th>
              <th className="pb-2 pr-4">Female</th>
              <th className="pb-2 pr-4">Male</th>
              <th className="pb-2 pr-4">Rookies</th>
              <th className="pb-2 pr-4">Returners</th>
              <th className="pb-2 pr-4">Fees due</th>
              <th className="pb-2 pr-4">Fees collected</th>
              <th className="pb-2">% paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {stats.map((s) => (
              <tr key={s.year} className="hover:bg-slate-50/50">
                <td className="py-2 pr-4 font-semibold text-slate-800">
                  <Link href={`/council/archive/${s.year}`} className="hover:text-[color:var(--accent)]">
                    {s.year}
                  </Link>
                </td>
                <td className="py-2 pr-4 font-medium text-slate-800">{s.total}</td>
                <td className="py-2 pr-4 text-[#E84AA5]">{s.female}</td>
                <td className="py-2 pr-4 text-[#1ED0D8]">{s.male}</td>
                <td className="py-2 pr-4 text-amber-600">{s.rookies}</td>
                <td className="py-2 pr-4 text-[color:var(--accent)]">
                  {s.returners} <span className="text-[color:var(--muted-foreground)]">({pct(s.returners, s.total)})</span>
                </td>
                <td className="py-2 pr-4 text-slate-700">{currency(s.totalDue)}</td>
                <td className="py-2 pr-4 text-[color:var(--success)]">{currency(s.totalPaid)}</td>
                <td className="py-2">
                  <span className={[
                    "rounded px-1.5 py-0.5 text-[0.68rem] font-medium",
                    s.totalDue > 0 && s.totalPaid / s.totalDue >= 0.9
                      ? "bg-[rgba(16,185,129,0.12)] text-[color:var(--success)]"
                      : s.totalDue > 0 && s.totalPaid / s.totalDue >= 0.6
                      ? "bg-[rgba(233,185,62,0.12)] text-[color:var(--warning)]"
                      : "bg-[rgba(239,68,68,0.1)] text-[color:var(--danger)]",
                  ].join(" ")}>
                    {s.totalDue > 0 ? `${Math.round((s.totalPaid / s.totalDue) * 100)}%` : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ArchiveStatsPage() {
  await requireCouncilUser();
  const stats = await getYearOnYearStats();

  if (stats.length === 0) {
    return (
      <div className="max-w-4xl">
        <Link href="/council/archive" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Archives
        </Link>
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No archived seasons yet — stats will appear here once a season is archived.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/council/archive" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Archives
        </Link>
        <span className="text-[color:var(--border)]">/</span>
        <span className="text-[0.82rem] font-medium text-slate-700 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-[color:var(--accent)]" />
          Year-on-year stats
        </span>
      </div>

      {/* Retention callout if ≥2 years */}
      {stats.length >= 2 && (() => {
        const latest = stats[0]!;
        const retentionPct = latest.total > 0 ? Math.round((latest.returners / latest.total) * 100) : 0;
        return (
          <div className="council-panel rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <RefreshCcw className="h-5 w-5 text-[color:var(--accent)]" />
                <div>
                  <p className="text-[0.88rem] font-semibold text-slate-800">
                    {retentionPct}% retention — {latest.year} season
                  </p>
                  <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                    {latest.returners} of {latest.total} members also played in {latest.year - 1} ·{" "}
                    {latest.newPlayers} new this season
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-4 text-center">
                <div>
                  <p className="text-[1.2rem] font-bold text-[color:var(--accent)]">{latest.returners}</p>
                  <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">returners</p>
                </div>
                <div>
                  <p className="text-[1.2rem] font-bold text-slate-800">{latest.newPlayers}</p>
                  <p className="text-[0.65rem] text-[color:var(--muted-foreground)]">new players</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary table */}
      <SummaryTable stats={stats} />

      {/* Per-year detail cards */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.92rem] font-semibold text-slate-800">Season breakdowns</h3>
        </div>
        <div className="space-y-4">
          {stats.map((stat, i) => (
            <YearCard
              key={stat.year}
              stat={stat}
              prevStat={stats[i + 1] ?? null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
