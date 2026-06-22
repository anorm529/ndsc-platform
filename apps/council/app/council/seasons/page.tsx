import Link from "next/link";
import { Trophy, Plus, Users, CheckCircle2, Archive, Lock, Pencil } from "lucide-react";
import { requireCouncilUser, requireRosterManagementAccess } from "@/lib/council-session";
import { getAllSeasons, type SeasonRow, type SeasonStatus } from "@/lib/season-queries";

const STATUS_CONFIG: Record<SeasonStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  draft:    { label: "Draft",    bg: "bg-slate-100",                    text: "text-slate-500",                icon: Pencil },
  active:   { label: "Active",   bg: "bg-[rgba(16,185,129,0.1)]",       text: "text-[color:var(--success)]",   icon: CheckCircle2 },
  closed:   { label: "Closed",   bg: "bg-[rgba(233,185,62,0.1)]",       text: "text-[color:var(--warning)]",   icon: Lock },
  archived: { label: "Archived", bg: "bg-[rgba(115,145,176,0.08)]",     text: "text-[color:var(--muted-foreground)]", icon: Archive },
};

function StatusBadge({ status }: { status: SeasonStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function SeasonCard({ season }: { season: SeasonRow }) {
  const unassigned = (season.enrolledCount ?? 0) - (season.assignedCount ?? 0);
  return (
    <Link
      href={`/council/seasons/${season.id}`}
      className="council-panel group block rounded-2xl border p-5 hover:border-[color:var(--border-strong)] transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.08)]">
            <Trophy className="h-5 w-5 text-[color:var(--accent)]" />
          </div>
          <div>
            <p className="text-[1rem] font-semibold text-slate-800">{season.year} Season</p>
            <p className="text-[0.75rem] text-[color:var(--muted-foreground)]">
              {season.enrolledCount ?? 0} enrolled · {season.assignedCount ?? 0} assigned
              {unassigned > 0 ? ` · ${unassigned} unassigned` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {season.status === "active" && season.transfersLocked && (
            <span className="flex items-center gap-1 rounded-full bg-[rgba(239,68,68,0.08)] px-2.5 py-0.5 text-[0.68rem] font-medium text-[color:var(--danger)]">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
          <StatusBadge status={season.status} />
        </div>
      </div>

      {(season.enrolledCount ?? 0) > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[0.68rem] text-[color:var(--muted-foreground)]">
            <span>Roster assignment</span>
            <span>{season.assignedCount} / {season.enrolledCount}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(115,145,176,0.15)]">
            <div
              className="h-full rounded-full bg-[color:var(--accent)]"
              style={{ width: `${Math.min(100, ((season.assignedCount ?? 0) / (season.enrolledCount ?? 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

export default async function SeasonsPage() {
  const user = await requireCouncilUser();
  await requireRosterManagementAccess(user);

  const seasons = await getAllSeasons();
  const activeSeason = seasons.find((s) => s.status === "active");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[color:var(--accent)]" />
          <p className="text-[0.9rem] text-[color:var(--muted-foreground)]">
            <span className="font-semibold text-slate-800">{seasons.length}</span> seasons
            {activeSeason ? ` · ${activeSeason.year} is active` : ""}
          </p>
        </div>
        {user.isOwner && (
          <Link
            href="/council/seasons/new"
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-medium text-white hover:brightness-105"
          >
            <Plus className="h-3.5 w-3.5" />
            New season
          </Link>
        )}
      </div>

      {seasons.length === 0 ? (
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <Trophy className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No seasons yet.</p>
          {user.isOwner && (
            <Link href="/council/seasons/new" className="mt-3 inline-block text-[0.82rem] text-[color:var(--accent)] hover:underline">
              Create the first season →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map((s) => <SeasonCard key={s.id} season={s} />)}
        </div>
      )}
    </div>
  );
}
