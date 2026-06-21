import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Users, CheckCircle2, Archive, Lock, Pencil,
  UserPlus, ChevronRight,
} from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess, type CouncilUser } from "@/lib/council-session";
import {
  getSeasonById, getSeasonEnrollments, getAllTeams, updateSeasonStatus, setTransfersLocked,
  type SeasonRow, type SeasonStatus, type EnrollmentRow, type TeamRow,
} from "@/lib/season-queries";
import {
  getPlayerProfiles, getCurrentFeeStatuses, getFeeStatusesForYear,
  takeSeasonArchiveSnapshot,
  type PlayerProfile, type PlayerFeeStatus,
} from "@/lib/council-queries";
import { getUnenrolledActivePlayers } from "@/lib/season-queries";
import { getCouncilMembers } from "@/lib/main-db";
import { getAllCaptainAssignmentsForSeason } from "@/lib/captain-queries";
import { AssignTeamForm } from "./assign-team-form";
import { AddPlayerForm } from "./add-player-form";
import { CaptainAssignmentForm } from "./captain-assignment-form";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SeasonStatus, { label: string; bg: string; text: string }> = {
  draft:    { label: "Draft",    bg: "bg-slate-100",                    text: "text-slate-500" },
  active:   { label: "Active",   bg: "bg-[rgba(16,185,129,0.1)]",       text: "text-[color:var(--success)]" },
  closed:   { label: "Closed",   bg: "bg-[rgba(233,185,62,0.1)]",       text: "text-[color:var(--warning)]" },
  archived: { label: "Archived", bg: "bg-[rgba(115,145,176,0.08)]",     text: "text-[color:var(--muted-foreground)]" },
};

// ─── Fee badge ────────────────────────────────────────────────────────────────

function FeeBadge({ fee }: { fee: PlayerFeeStatus | null }) {
  if (!fee) return null;
  if (fee.status === "paid")    return <span className="rounded bg-[rgba(16,185,129,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--success)]">Paid</span>;
  if (fee.status === "partial") return <span className="rounded bg-[rgba(233,185,62,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--warning)]">Part</span>;
  return <span className="rounded bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--danger)]">Due</span>;
}

// ─── Player row ───────────────────────────────────────────────────────────────

function EnrollmentPlayerRow({
  enr, profile, fee, teams, season, canManage, user,
}: {
  enr: EnrollmentRow;
  profile: PlayerProfile | null;
  fee: PlayerFeeStatus | null;
  teams: TeamRow[];
  season: SeasonRow;
  canManage: boolean;
  user: CouncilUser;
}) {
  const name = enr.registrationName || enr.displayName || enr.email?.split("@")[0] || "Unknown";
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(20,184,166,0.08)] text-[0.68rem] font-semibold text-[color:var(--accent)]">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.85rem] font-medium text-slate-800 truncate">{name}</p>
        {enr.email && <p className="text-[0.7rem] text-[color:var(--muted-foreground)] truncate">{enr.email}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {profile?.isRookie && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-600">R</span>}
        {profile?.isUmpire && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-blue-600">U</span>}
        {enr.gender?.toLowerCase() === "female" && <span className="rounded-full bg-[rgba(232,74,165,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[#E84AA5]">F</span>}
        {enr.gender?.toLowerCase() === "male"   && <span className="rounded-full bg-[rgba(30,208,216,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[#1ED0D8]">M</span>}
        <FeeBadge fee={fee} />
        {canManage && (season.status === "active" || season.status === "draft") && (
          <AssignTeamForm
            playerId={enr.playerId}
            seasonId={season.id}
            currentTeamId={enr.currentTeamId}
            teams={teams}
            userId={user.id}
          />
        )}
      </div>
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const user = await requireCouncilUser();
  const canManage = hasRosterManagementAccess(user);

  const [season, enrollments, teams, profileMap, feeStatusMap] = await Promise.all([
    getSeasonById(seasonId),
    getSeasonEnrollments(seasonId),
    getAllTeams(),
    getPlayerProfiles(),
    getCurrentFeeStatuses(),
  ]);

  const unenrolled = canManage && season && (season.status === "draft" || season.status === "active")
    ? await getUnenrolledActivePlayers(seasonId)
    : [];

  const [captainAssignments, councilMembers] = canManage
    ? await Promise.all([
        getAllCaptainAssignmentsForSeason(season!.year),
        getCouncilMembers(),
      ])
    : [[], []];

  if (!season) notFound();

  // Group enrollments by team
  const teamMap = new Map(teams.map((t) => [t.id, t]));
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

  const statusCfg = STATUS_CONFIG[season.status];

  async function handleTransition(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    if (!u.isOwner) redirect("/council/seasons/" + seasonId);
    const to = String(formData.get("to")) as SeasonStatus;

    if (to === "archived") {
      const [allEnrollments, profiles, fees] = await Promise.all([
        getSeasonEnrollments(seasonId),
        getPlayerProfiles(),
        getFeeStatusesForYear(season!.year),
      ]);
      await takeSeasonArchiveSnapshot(season!.year, allEnrollments, profiles, fees, u.id);
    }

    await updateSeasonStatus(seasonId, to);
    redirect("/council/seasons/" + seasonId);
  }

  async function handleToggleLock(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    if (!u.isOwner) redirect("/council/seasons/" + seasonId);
    const lock = formData.get("lock") === "true";
    await setTransfersLocked(seasonId, lock);
    redirect("/council/seasons/" + seasonId);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/council/seasons" className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Seasons
      </Link>

      {/* Season header */}
      <div className="council-panel rounded-2xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(20,184,166,0.08)]">
              <Trophy className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <h2 className="text-[1.05rem] font-semibold text-slate-800">{season.year} Season</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex gap-5 text-center">
            <div>
              <p className="text-[1.4rem] font-bold text-slate-800">{enrollments.length}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">enrolled</p>
            </div>
            <div>
              <p className="text-[1.4rem] font-bold text-[color:var(--accent)]">{enrollments.length - unassigned.length}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">assigned</p>
            </div>
            <div>
              <p className="text-[1.4rem] font-bold text-[color:var(--warning)]">{unassigned.length}</p>
              <p className="text-[0.68rem] text-[color:var(--muted-foreground)]">unassigned</p>
            </div>
          </div>
        </div>

        {/* Status controls (owner only) */}
        {user.isOwner && season.status !== "archived" && (
          <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-4">

            {/* Draft → Active */}
            {season.status === "draft" && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
                  Open this season to start enrolling players.
                </p>
                <form action={handleTransition}>
                  <input type="hidden" name="to" value="active" />
                  <button type="submit" className="rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-medium text-white hover:brightness-105">
                    Open for enrollment
                  </button>
                </form>
              </div>
            )}

            {/* Active: lock toggle + close */}
            {season.status === "active" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.82rem] font-medium text-slate-700">
                      {season.transfersLocked ? "Transfers locked" : "Transfers open"}
                    </p>
                    <p className="text-[0.72rem] text-[color:var(--muted-foreground)]">
                      {season.transfersLocked
                        ? "Captains cannot move players between teams."
                        : "Captains can move players between teams."}
                    </p>
                  </div>
                  <form action={handleToggleLock}>
                    <input type="hidden" name="lock" value={season.transfersLocked ? "false" : "true"} />
                    <button
                      type="submit"
                      className={season.transfersLocked
                        ? "rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-medium text-white hover:brightness-105"
                        : "rounded-xl bg-[rgba(239,68,68,0.08)] px-4 py-2 text-[0.82rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)]"}
                    >
                      {season.transfersLocked ? "Unlock transfers" : "Lock transfers"}
                    </button>
                  </form>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-3">
                  <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
                    Close the season when it is fully over. This prevents new enrollments.
                  </p>
                  <form action={handleTransition}>
                    <input type="hidden" name="to" value="closed" />
                    <button type="submit" className="rounded-xl bg-[rgba(239,68,68,0.08)] px-4 py-2 text-[0.82rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)]">
                      Close season
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Closed: reopen or archive */}
            {season.status === "closed" && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
                  Season is closed. Archive to create a permanent membership snapshot, or reopen if needed.
                </p>
                <div className="flex gap-2">
                  <form action={handleTransition}>
                    <input type="hidden" name="to" value="active" />
                    <button type="submit" className="rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-medium text-white hover:brightness-105">
                      Reopen season
                    </button>
                  </form>
                  <form action={handleTransition}>
                    <input type="hidden" name="to" value="archived" />
                    <button type="submit" className="rounded-xl bg-[rgba(239,68,68,0.08)] px-4 py-2 text-[0.82rem] font-medium text-[color:var(--danger)] hover:bg-[rgba(239,68,68,0.15)]">
                      Archive season
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Enroll players — management only, season must be draft or active */}
      {canManage && (season.status === "draft" || season.status === "active") && (
        <div className="council-panel rounded-2xl border p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[0.92rem] font-semibold text-slate-800 mr-auto">
              <UserPlus className="h-4 w-4 text-[color:var(--accent)]" />
              Enroll players
            </div>
            <Link
              href={`/council/seasons/${season.id}/enroll`}
              className="flex items-center gap-1.5 rounded-xl bg-[rgba(20,184,166,0.1)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--accent)] hover:bg-[rgba(20,184,166,0.18)]"
            >
              Carry forward / bulk enroll
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 border-t border-[color:var(--border)] pt-3">
            <AddPlayerForm seasonId={season.id} userId={user.id} unenrolled={unenrolled} />
          </div>
        </div>
      )}

      {/* Roster by team */}
      {teams.map((team) => {
        const roster = byTeam.get(team.id) ?? [];
        if (roster.length === 0) return null;
        const female = roster.filter((e) => e.gender?.toLowerCase() === "female");
        const male   = roster.filter((e) => e.gender?.toLowerCase() === "male");
        const other  = roster.filter((e) => !["female","male"].includes(e.gender?.toLowerCase() ?? ""));

        return (
          <section key={team.id} className="council-panel rounded-2xl border p-5">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-[0.92rem] font-semibold text-slate-800">{team.name}</h3>
              <span className="ml-auto rounded-full bg-[rgba(20,184,166,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
                {roster.length} {roster.length === 1 ? "player" : "players"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {female.length > 0 && (
                <div>
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#E84AA5]">Female · {female.length}</p>
                  <ul className="divide-y divide-[color:var(--border)]">
                    {female.map((e) => (
                      <EnrollmentPlayerRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} canManage={canManage} user={user} />
                    ))}
                  </ul>
                </div>
              )}
              {male.length > 0 && (
                <div>
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#1ED0D8]">Male · {male.length}</p>
                  <ul className="divide-y divide-[color:var(--border)]">
                    {male.map((e) => (
                      <EnrollmentPlayerRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} canManage={canManage} user={user} />
                    ))}
                  </ul>
                </div>
              )}
              {other.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Other · {other.length}</p>
                  <ul className="divide-y divide-[color:var(--border)]">
                    {other.map((e) => (
                      <EnrollmentPlayerRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} canManage={canManage} user={user} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Unassigned pool */}
      {unassigned.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-[0.92rem] font-semibold text-slate-800">Unassigned pool</h3>
            <span className="ml-auto rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--warning)]">
              {unassigned.length} awaiting team
            </span>
          </div>
          <ul className="divide-y divide-[color:var(--border)]">
            {unassigned.map((e) => (
              <EnrollmentPlayerRow key={e.id} enr={e} profile={profileMap.get(e.playerId) ?? null} fee={feeStatusMap.get(e.playerId) ?? null} teams={teams} season={season} canManage={canManage} user={user} />
            ))}
          </ul>
        </section>
      )}

      {enrollments.length === 0 && (
        <div className="council-panel rounded-2xl border p-12 text-center text-[color:var(--muted-foreground)]">
          <Users className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">No players enrolled yet.</p>
          {canManage && (season.status === "draft" || season.status === "active") && (
            <Link
              href={`/council/seasons/${season.id}/enroll`}
              className="mt-3 inline-block text-[0.82rem] text-[color:var(--accent)] hover:underline"
            >
              Enroll players →
            </Link>
          )}
        </div>
      )}

      {/* Captain assignment management — owner/chair only */}
      {canManage && (() => {
        const captainMap = Object.fromEntries(
          teams.map((t) => {
            const assignment = captainAssignments.find((a) => a.teamId === t.id);
            if (!assignment) return [t.id, null];
            const member = councilMembers.find((m) => m.id === assignment.userId);
            const name = member
              ? (member.registrationName || member.displayName || member.email.split("@")[0])
              : "Unknown";
            return [t.id, { userId: assignment.userId, name }];
          })
        );
        return (
          <CaptainAssignmentForm
            teams={teams}
            seasonYear={season.year}
            captainMap={captainMap}
            members={councilMembers}
          />
        );
      })()}
    </div>
  );
}
