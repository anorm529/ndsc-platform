import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, Users } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getMembershipSnapshot, type MembershipSnapshot } from "@/lib/council-queries";

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FeeBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "paid")    return <span className="rounded bg-[rgba(16,185,129,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--success)]">Paid</span>;
  if (status === "partial") return <span className="rounded bg-[rgba(233,185,62,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--warning)]">Part</span>;
  return <span className="rounded bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--danger)]">Due</span>;
}

function PlayerRow({ snap }: { snap: MembershipSnapshot }) {
  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(20,184,166,0.08)] text-[0.68rem] font-semibold text-[color:var(--accent)]">
        {snap.playerName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.85rem] font-medium text-slate-800">{snap.playerName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {snap.isRookie && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-600">R</span>}
        {snap.isUmpire && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-blue-600">U</span>}
        {snap.gender?.toLowerCase() === "female" && <span className="rounded-full bg-[rgba(232,74,165,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[#E84AA5]">F</span>}
        {snap.gender?.toLowerCase() === "male"   && <span className="rounded-full bg-[rgba(30,208,216,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[#1ED0D8]">M</span>}
        <FeeBadge status={snap.feeStatus} />
        {snap.amountDue !== null && (
          <span className="text-[0.68rem] text-[color:var(--muted-foreground)]">
            £{snap.amountPaid?.toFixed(0) ?? "0"}/{snap.amountDue.toFixed(0)}
          </span>
        )}
      </div>
    </li>
  );
}

export default async function ArchiveYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) notFound();

  await requireCouncilUser();
  const snapshots = await getMembershipSnapshot(year);
  if (snapshots.length === 0) notFound();

  // Group by team
  const byTeam = new Map<string, MembershipSnapshot[]>();
  const unassigned: MembershipSnapshot[] = [];

  for (const s of snapshots) {
    const key = s.teamName ?? "__unassigned__";
    if (!s.teamName) {
      unassigned.push(s);
    } else {
      const list = byTeam.get(key) ?? [];
      list.push(s);
      byTeam.set(key, list);
    }
  }

  // Summary stats
  const paidCount    = snapshots.filter((s) => s.feeStatus === "paid").length;
  const partialCount = snapshots.filter((s) => s.feeStatus === "partial").length;
  const unpaidCount  = snapshots.filter((s) => s.feeStatus === "unpaid").length;
  const femaleCount  = snapshots.filter((s) => s.gender?.toLowerCase() === "female").length;
  const maleCount    = snapshots.filter((s) => s.gender?.toLowerCase() === "male").length;
  const snapDate     = snapshots[0]?.snapshottedAt;

  const sortedTeams = [...byTeam.keys()].sort();

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/council/archive"
        className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Archives
      </Link>

      {/* Header */}
      <div className="council-panel rounded-2xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.08)]">
              <Archive className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <h2 className="text-[1.05rem] font-semibold text-slate-800">{year} Season Archive</h2>
              {snapDate && (
                <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                  Snapshotted {formatDate(snapDate)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-center">
            <div>
              <p className="text-[1.4rem] font-bold text-slate-800">{snapshots.length}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">members</p>
            </div>
            <div>
              <p className="text-[1.4rem] font-bold text-[#E84AA5]">{femaleCount}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">female</p>
            </div>
            <div>
              <p className="text-[1.4rem] font-bold text-[#1ED0D8]">{maleCount}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">male</p>
            </div>
            <div>
              <p className="text-[1.4rem] font-bold text-[color:var(--success)]">{paidCount}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">fees paid</p>
            </div>
            {partialCount > 0 && (
              <div>
                <p className="text-[1.4rem] font-bold text-[color:var(--warning)]">{partialCount}</p>
                <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">partial</p>
              </div>
            )}
            {unpaidCount > 0 && (
              <div>
                <p className="text-[1.4rem] font-bold text-[color:var(--danger)]">{unpaidCount}</p>
                <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">unpaid</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team sections */}
      {sortedTeams.map((teamName) => {
        const roster = byTeam.get(teamName) ?? [];
        const female = roster.filter((s) => s.gender?.toLowerCase() === "female");
        const male   = roster.filter((s) => s.gender?.toLowerCase() === "male");
        const other  = roster.filter((s) => !["female","male"].includes(s.gender?.toLowerCase() ?? ""));

        return (
          <section key={teamName} className="council-panel rounded-2xl border p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[color:var(--accent)]" />
              <h3 className="text-[0.92rem] font-semibold text-slate-800">{teamName}</h3>
              <span className="ml-auto rounded-full bg-[rgba(20,184,166,0.08)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
                {roster.length} {roster.length === 1 ? "player" : "players"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {female.length > 0 && (
                <div>
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#E84AA5]">Female · {female.length}</p>
                  <ul className="divide-y divide-[color:var(--border)]">
                    {female.map((s) => <PlayerRow key={s.id} snap={s} />)}
                  </ul>
                </div>
              )}
              {male.length > 0 && (
                <div>
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#1ED0D8]">Male · {male.length}</p>
                  <ul className="divide-y divide-[color:var(--border)]">
                    {male.map((s) => <PlayerRow key={s.id} snap={s} />)}
                  </ul>
                </div>
              )}
              {other.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Other · {other.length}</p>
                  <ul className="grid sm:grid-cols-2 divide-y divide-[color:var(--border)]">
                    {other.map((s) => <PlayerRow key={s.id} snap={s} />)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Unassigned at archive time</h3>
            <span className="ml-auto rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--warning)]">
              {unassigned.length}
            </span>
          </div>
          <ul className="grid gap-0 divide-y divide-[color:var(--border)] sm:grid-cols-2 sm:divide-y-0">
            {unassigned.map((s) => <PlayerRow key={s.id} snap={s} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
