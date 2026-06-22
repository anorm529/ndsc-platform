import Link from "next/link";
import { Users, ArrowRight, History, Shield, Lock } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getAllSeasons, getSeasonEnrollments, getAllTeams, type EnrollmentRow, type TeamRow, type SeasonRow } from "@/lib/season-queries";
import { getPlayerProfiles, getCurrentFeeStatuses, type PlayerProfile, type PlayerFeeStatus } from "@/lib/council-queries";
import { getCaptainTeamIdsForSeason } from "@/lib/captain-queries";
import { getRosterTransfersForSeason, type RosterTransfer } from "@/lib/audit-queries";
import { AssignTeamForm } from "../seasons/[seasonId]/assign-team-form";
import { CollapsibleTeamCard } from "@/components/collapsible-team-card";

function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function TransferHistory({ transfers }: { transfers: RosterTransfer[] }) {
  if (transfers.length === 0) {
    return (
      <p className="py-4 text-center text-[0.82rem] italic text-[color:var(--muted-foreground)]">
        No roster moves recorded yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[color:var(--border)]">
      {transfers.map((t) => (
        <li key={t.id} className="flex items-start gap-3 py-2.5 text-[0.8rem]">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(20,184,166,0.08)]">
            <ArrowRight className="h-3 w-3 text-[color:var(--accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800">{t.playerName}</p>
            <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
              {t.fromTeam ? t.fromTeam : "Unassigned"}
              {" → "}
              {t.toTeam ? t.toTeam : "Unassigned"}
              {t.notes && <span className="ml-1 italic">· {t.notes}</span>}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">{formatDateTime(t.transferredAt)}</p>
            {t.actorName && (
              <p className="text-[0.65rem] text-slate-400">{t.actorName}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Player row ───────────────────────────────────────────────────────────────

function RosterRow({
  enr,
  profile,
  fee,
  teams,
  season,
  captainTeamIds,
  canManage,
  userId,
}: {
  enr: EnrollmentRow;
  profile: PlayerProfile | null;
  fee: PlayerFeeStatus | null;
  teams: TeamRow[];
  season: SeasonRow;
  captainTeamIds: string[];
  canManage: boolean;
  userId: string;
}) {
  const name = enr.registrationName || enr.displayName || enr.email?.split("@")[0] || "Unknown";

  // Captain sees a simplified team selector scoped to their team + unassigned
  const visibleTeams = canManage
    ? teams
    : teams.filter((t) => captainTeamIds.includes(t.id));

  const canAssign = canManage || captainTeamIds.length > 0;

  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(20,184,166,0.08)] text-[0.68rem] font-semibold text-[color:var(--accent)]">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.85rem] font-medium text-slate-800">{name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {profile?.isRookie && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-600">R</span>
        )}
        {profile?.isUmpire && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-blue-600">U</span>
        )}
        {enr.gender?.toLowerCase() === "female" && (
          <span className="rounded-full bg-[rgba(232,74,165,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[#E84AA5]">F</span>
        )}
        {enr.gender?.toLowerCase() === "male" && (
          <span className="rounded-full bg-[rgba(30,208,216,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[#1ED0D8]">M</span>
        )}
        {fee?.status === "paid" && (
          <span className="rounded bg-[rgba(16,185,129,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--success)]">Paid</span>
        )}
        {fee?.status === "partial" && (
          <span className="rounded bg-[rgba(233,185,62,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--warning)]">Part</span>
        )}
        {fee?.status === "unpaid" && (
          <span className="rounded bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--danger)]">Due</span>
        )}
        {canAssign && season.status === "active" && (
          <AssignTeamForm
            playerId={enr.playerId}
            seasonId={season.id}
            currentTeamId={enr.currentTeamId}
            teams={visibleTeams}
            userId={userId}
          />
        )}
      </div>
    </li>
  );
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  roster,
  profileMap,
  feeStatusMap,
  teams,
  season,
  captainTeamIds,
  canManage,
  userId,
  highlight,
}: {
  team: TeamRow;
  roster: EnrollmentRow[];
  profileMap: Map<string, PlayerProfile>;
  feeStatusMap: Map<string, PlayerFeeStatus>;
  teams: TeamRow[];
  season: SeasonRow;
  captainTeamIds: string[];
  canManage: boolean;
  userId: string;
  highlight: boolean;
}) {
  const female = roster.filter((e) => e.gender?.toLowerCase() === "female")
    .sort((a, b) => (a.registrationName || a.displayName).localeCompare(b.registrationName || b.displayName));
  const male = roster.filter((e) => e.gender?.toLowerCase() === "male")
    .sort((a, b) => (a.registrationName || a.displayName).localeCompare(b.registrationName || b.displayName));
  const other = roster.filter((e) => !["female", "male"].includes(e.gender?.toLowerCase() ?? ""))
    .sort((a, b) => (a.registrationName || a.displayName).localeCompare(b.registrationName || b.displayName));

  return (
    <CollapsibleTeamCard
      teamName={team.name}
      count={roster.length}
      highlight={highlight}
      defaultOpen={highlight}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {female.length > 0 && (
          <div>
            <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#E84AA5]">
              Female · {female.length}
            </p>
            <ul className="divide-y divide-[color:var(--border)]">
              {female.map((e) => (
                <RosterRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} captainTeamIds={captainTeamIds} canManage={canManage} userId={userId} />
              ))}
            </ul>
          </div>
        )}
        {male.length > 0 && (
          <div>
            <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#1ED0D8]">
              Male · {male.length}
            </p>
            <ul className="divide-y divide-[color:var(--border)]">
              {male.map((e) => (
                <RosterRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} captainTeamIds={captainTeamIds} canManage={canManage} userId={userId} />
              ))}
            </ul>
          </div>
        )}
        {other.length > 0 && (
          <div className="sm:col-span-2">
            <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Other · {other.length}
            </p>
            <ul className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 divide-[color:var(--border)]">
              {other.map((e) => (
                <RosterRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} captainTeamIds={captainTeamIds} canManage={canManage} userId={userId} />
              ))}
            </ul>
          </div>
        )}
        {roster.length === 0 && (
          <p className="text-[0.82rem] italic text-[color:var(--muted-foreground)] sm:col-span-2">
            No players assigned to this team yet.
          </p>
        )}
      </div>
    </CollapsibleTeamCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CaptainsPage() {
  const user = await requireCouncilUser();
  const canManage = hasRosterManagementAccess(user);

  // Get the active season (fall back to most recent)
  const allSeasons = await getAllSeasons();
  const season = allSeasons.find((s) => s.status === "active") ?? allSeasons[0] ?? null;

  if (!season) {
    return (
      <div className="max-w-4xl">
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <Shield className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No seasons found.</p>
          {canManage && (
            <Link href="/council/seasons/new" className="mt-3 inline-block text-[0.82rem] text-[color:var(--accent)] hover:underline">
              Create a season →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const [enrollments, teams, profileMap, feeStatusMap, captainTeamIds] = await Promise.all([
    getSeasonEnrollments(season.id),
    getAllTeams(),
    getPlayerProfiles(),
    getCurrentFeeStatuses(),
    getCaptainTeamIdsForSeason(user.id, season.year),
  ]);

  // Fetch transfer history — scoped to captain's teams, or all for management
  const transfers = await getRosterTransfersForSeason(
    season.id,
    canManage ? undefined : captainTeamIds
  );

  // Determine which teams to show
  // Captains: only their team(s) + unassigned pool
  // Owners/chairs: all teams
  const visibleTeamIds = canManage
    ? teams.map((t) => t.id)
    : captainTeamIds;

  if (!canManage && captainTeamIds.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <Shield className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">You haven't been assigned as captain of any team for {season.year}.</p>
          <p className="mt-2 text-[0.78rem]">Contact the council chair to be assigned.</p>
        </div>
      </div>
    );
  }

  // Group enrollments by team
  const byTeam = new Map<string, EnrollmentRow[]>();
  const unassigned: EnrollmentRow[] = [];

  for (const e of enrollments) {
    if (e.currentTeamId) {
      const list = byTeam.get(e.currentTeamId) ?? [];
      list.push(e);
      byTeam.set(e.currentTeamId, list);
    } else {
      unassigned.push(e);
    }
  }

  const visibleTeams = teams.filter((t) => visibleTeamIds.includes(t.id));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[color:var(--accent)]" />
          <p className="text-[0.9rem] text-[color:var(--muted-foreground)]">
            <span className="font-semibold text-slate-800">{season.year} Season</span>
            {" · "}
            {enrollments.length} enrolled
            {" · "}
            {unassigned.length} unassigned
          </p>
        </div>
        {!canManage && (
          <span className="ml-auto rounded-full bg-[rgba(20,184,166,0.08)] px-3 py-1 text-[0.72rem] font-medium text-[color:var(--accent)]">
            Captain view
          </span>
        )}
        {canManage && (
          <Link
            href={`/council/seasons/${season.id}`}
            className="ml-auto text-[0.78rem] text-[color:var(--accent)] hover:underline"
          >
            Manage season →
          </Link>
        )}
      </div>

      {/* Transfers locked banner */}
      {season.transfersLocked && (
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-4 py-3 text-[0.82rem] text-[color:var(--danger)]">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Transfers are locked — captains cannot move players between teams.
          {canManage && (
            <Link href={`/council/seasons/${season.id}`} className="ml-auto shrink-0 underline underline-offset-2">
              Manage →
            </Link>
          )}
        </div>
      )}

      {/* Team cards */}
      {visibleTeams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          roster={byTeam.get(team.id) ?? []}
          profileMap={profileMap}
          feeStatusMap={feeStatusMap}
          teams={teams}
          season={season}
          captainTeamIds={captainTeamIds}
          canManage={canManage}
          userId={user.id}
          highlight={captainTeamIds.includes(team.id)}
        />
      ))}

      {/* Unassigned pool — captains see it so they can pull players in */}
      {unassigned.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Unassigned pool</h3>
            <span className="ml-auto rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--warning)]">
              {unassigned.length} awaiting team
            </span>
          </div>
          <ul className="grid gap-0 divide-y divide-[color:var(--border)] sm:grid-cols-2 sm:divide-y-0">
            {unassigned
              .sort((a, b) => (a.registrationName || a.displayName).localeCompare(b.registrationName || b.displayName))
              .map((e) => (
                <RosterRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} captainTeamIds={captainTeamIds} canManage={canManage} userId={user.id} />
              ))}
          </ul>
        </section>
      )}

      {enrollments.length === 0 && (
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <Users className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No players enrolled in the {season.year} season yet.</p>
          {canManage && (
            <Link href={`/council/seasons/${season.id}/enroll`} className="mt-3 inline-block text-[0.82rem] text-[color:var(--accent)] hover:underline">
              Enroll players →
            </Link>
          )}
        </div>
      )}

      {/* Transfer history */}
      <section className="council-panel rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.92rem] font-semibold text-slate-800">Transfer history</h3>
          <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">
            {season.year} season · last {transfers.length}
          </span>
        </div>
        <TransferHistory transfers={transfers} />
      </section>
    </div>
  );
}
