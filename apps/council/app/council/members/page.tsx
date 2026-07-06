import { Users, UserCheck, Filter, LogIn, UserX } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getAllActivePlayers, getAllPlayers, playerDisplayName, type PlayerRow } from "@/lib/main-db";
import { getAllTeams, getMemberTeamMap, getCaptainTeamIds, getMembersOnTeam } from "@/lib/team-queries";
import { getPlayerProfiles, getCurrentFeeStatuses, type PlayerProfile, type PlayerFeeStatus } from "@/lib/council-queries";
import { getFlaggedPlayerIds } from "@/lib/account-queries";
import { PlayerProfileEditor } from "./player-profile-editor";
import { ToggleActiveButton } from "./toggle-active-button";
import { SendInviteButton } from "./send-invite-button";

export default async function MembersPage() {
  const user = await requireCouncilUser();
  const canToggle = hasRosterManagementAccess(user);
  const isCapt = !user.isOwner && user.councilPermissions.has("captain") &&
                 !user.councilPermissions.has("treasurer") &&
                 !user.councilPermissions.has("secretary");

  const [allPlayers, allTeams, memberTeamMap, profileMap, feeStatusMap, flaggedIds] = await Promise.all([
    canToggle ? getAllPlayers() : getAllActivePlayers(),
    getAllTeams(),
    getMemberTeamMap(),
    getPlayerProfiles(),
    getCurrentFeeStatuses(),
    getFlaggedPlayerIds(),
  ]);

  let scopedUserIds: Set<string> | null = null;
  if (isCapt) {
    const captainTeamIds = await getCaptainTeamIds(user.id);
    if (captainTeamIds.length > 0) {
      const memberLists = await Promise.all(captainTeamIds.map(getMembersOnTeam));
      scopedUserIds = new Set(memberLists.flat());
    } else {
      scopedUserIds = new Set();
    }
  }

  const allScopedPlayers = scopedUserIds
    ? allPlayers.filter((p) => p.userId && scopedUserIds!.has(p.userId))
    : allPlayers;

  const visiblePlayers = allScopedPlayers.filter((p) => p.active);
  const inactivePlayers = allScopedPlayers.filter((p) => !p.active);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  const teamGroups = new Map<string, typeof visiblePlayers>();
  const unassigned: typeof visiblePlayers = [];

  for (const player of visiblePlayers) {
    const teamIds = player.userId ? (memberTeamMap.get(player.userId) ?? []) : [];
    if (teamIds.length === 0) {
      unassigned.push(player);
    } else {
      for (const tid of teamIds) {
        const existing = teamGroups.get(tid) ?? [];
        existing.push(player);
        teamGroups.set(tid, existing);
      }
    }
  }

  const teamEntries = Array.from(teamGroups.entries()).sort(([a], [b]) => {
    const nameA = teamById.get(a)?.name ?? "";
    const nameB = teamById.get(b)?.name ?? "";
    return nameA.localeCompare(nameB);
  });

  const withLogin = visiblePlayers.filter((p) => p.userId && p.accountStatus === "active").length;
  const noLogin = visiblePlayers.filter((p) => !p.userId).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[color:var(--accent)]" />
          <p className="text-[0.9rem] text-[color:var(--muted-foreground)]">
            <span className="font-semibold text-slate-800">{visiblePlayers.length}</span> active players
            {isCapt ? " on your team" : ""}
          </p>
        </div>
        {!isCapt && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.1)] px-3 py-1 text-[0.72rem] font-medium text-[color:var(--success)]">
              <LogIn className="h-3 w-3" />
              {withLogin} with login
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[rgba(115,145,176,0.1)] px-3 py-1 text-[0.72rem] font-medium text-[color:var(--muted-foreground)]">
              <UserX className="h-3 w-3" />
              {noLogin} no login
            </span>
          </div>
        )}
        {isCapt && (
          <span className="flex items-center gap-1.5 rounded-full bg-[color:var(--accent-muted)] px-3 py-1 text-[0.72rem] font-medium text-[color:var(--accent)] ml-auto">
            <Filter className="h-3 w-3" />
            Captain view
          </span>
        )}
      </div>

      {teamEntries.map(([teamId, players]) => {
        const team = teamById.get(teamId);
        return (
          <section key={teamId} className="council-panel rounded-2xl border p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[color:var(--accent)]" />
              <h2 className="text-[0.92rem] font-semibold text-slate-800">{team?.name ?? "Unknown Team"}</h2>
              <span className="ml-auto rounded-full bg-[rgba(20,184,166,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
                {players.length} {players.length === 1 ? "player" : "players"}
              </span>
            </div>
            <PlayerList players={players} profileMap={profileMap} feeStatusMap={feeStatusMap} canToggle={canToggle} flaggedIds={flaggedIds} />
          </section>
        );
      })}

      {unassigned.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <h2 className="text-[0.92rem] font-semibold text-slate-800">No team assigned</h2>
            <span className="ml-auto rounded-full bg-[rgba(115,145,176,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--muted-foreground)]">
              {unassigned.length}
            </span>
          </div>
          <PlayerList players={unassigned} profileMap={profileMap} feeStatusMap={feeStatusMap} canToggle={canToggle} flaggedIds={flaggedIds} />
        </section>
      )}

      {visiblePlayers.length === 0 && inactivePlayers.length === 0 && (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          {isCapt ? "No members assigned to your team yet." : "No active players found."}
        </div>
      )}

      {inactivePlayers.length > 0 && (
        <section className="council-panel rounded-2xl border border-dashed p-5 opacity-60">
          <div className="mb-4 flex items-center gap-2">
            <UserX className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <h2 className="text-[0.92rem] font-semibold text-slate-500">Inactive players</h2>
            <span className="ml-auto rounded-full bg-[rgba(115,145,176,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--muted-foreground)]">
              {inactivePlayers.length}
            </span>
          </div>
          <PlayerList players={inactivePlayers} profileMap={profileMap} feeStatusMap={feeStatusMap} canToggle={canToggle} flaggedIds={flaggedIds} />
        </section>
      )}
    </div>
  );
}

function GenderBadge({ gender }: { gender: string | null | undefined }) {
  if (gender?.toLowerCase() === "female")
    return <span className="rounded-full bg-[rgba(232,74,165,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[#E84AA5]">F</span>;
  if (gender?.toLowerCase() === "male")
    return <span className="rounded-full bg-[rgba(30,208,216,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[#1ED0D8]">M</span>;
  return <span className="text-[0.65rem] text-[color:var(--muted-foreground)]">—</span>;
}

function FeeBadge({ status }: { status: PlayerFeeStatus | null }) {
  if (!status) return <span className="text-[0.65rem] text-[color:var(--muted-foreground)]">—</span>;
  if (status.status === "paid")
    return <span className="rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--success)]">Paid</span>;
  if (status.status === "partial")
    return <span className="rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--warning)]">Part paid</span>;
  return <span className="rounded-full bg-[rgba(239,68,68,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--danger)]">Due</span>;
}

function LoginBadge({ userId, accountStatus }: { userId: string | null; accountStatus: string | null }) {
  if (userId && accountStatus === "active")
    return <span className="rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--success)]">Active</span>;
  if (userId && accountStatus === "pending")
    return <span className="rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--warning)]">Pending</span>;
  return <span className="rounded-full bg-[rgba(115,145,176,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--muted-foreground)]">No login</span>;
}

function PlayerList({ players, profileMap, feeStatusMap, canToggle, flaggedIds }: {
  players: PlayerRow[];
  profileMap: Map<string, PlayerProfile>;
  feeStatusMap: Map<string, PlayerFeeStatus>;
  canToggle: boolean;
  flaggedIds: Set<string>;
}) {
  const colTemplate = canToggle
    ? "grid-cols-[2rem_1fr_3rem_4.5rem_4.5rem_5rem_5.5rem]"
    : "grid-cols-[2rem_1fr_3rem_4.5rem_4.5rem_5rem]";

  return (
    <div>
      {/* Column headers */}
      <div className={`mb-2 hidden ${colTemplate} items-center gap-3 px-1 sm:grid`}>
        <div />
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Player</span>
        <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Gender</span>
        <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Fees</span>
        <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Login</span>
        <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">DOB / Bat</span>
        {canToggle && <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Status</span>}
      </div>

      <ul className="divide-y divide-[color:var(--border)]">
        {players.map((p) => {
          const name = playerDisplayName(p);
          const hasActiveLogin = p.userId && p.accountStatus === "active";
          const profile = profileMap.get(p.playerId) ?? null;
          const feeStatus = feeStatusMap.get(p.playerId) ?? null;
          const isFlagged = flaggedIds.has(p.playerId);

          return (
            <li key={p.playerId} className="py-3">
              {/* Desktop: column grid */}
              <div className={`hidden ${colTemplate} items-center gap-3 sm:grid`}>
                {/* Avatar */}
                <div className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold",
                  hasActiveLogin
                    ? "bg-[rgba(20,184,166,0.08)] text-[color:var(--accent)]"
                    : "bg-[rgba(115,145,176,0.08)] text-[color:var(--muted-foreground)]",
                ].join(" ")}>
                  {name.charAt(0).toUpperCase()}
                </div>

                {/* Name + email */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[0.88rem] font-medium text-slate-800">{name}</p>
                    {isFlagged && (
                      <span
                        title="Data flag: player linked to multiple user accounts — check Flags page"
                        className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-amber-500 cursor-help"
                      >
                        ⚑ Flag
                      </span>
                    )}
                  </div>
                  {p.email ? (
                    <p className="truncate text-[0.72rem] text-[color:var(--muted-foreground)]">{p.email}</p>
                  ) : (
                    <p className="text-[0.72rem] italic text-[color:var(--muted-foreground)]">No account</p>
                  )}
                </div>

                {/* Gender */}
                <div className="flex justify-center">
                  <GenderBadge gender={p.gender} />
                </div>

                {/* Fees */}
                <div className="flex justify-center">
                  <FeeBadge status={feeStatus} />
                </div>

                {/* Login + invite */}
                <div className="flex flex-col items-center gap-1">
                  <LoginBadge userId={p.userId} accountStatus={p.accountStatus} />
                  {canToggle && !p.userId && p.active && (
                    <SendInviteButton playerId={p.playerId} />
                  )}
                </div>

                {/* Profile (DOB + bat hand) */}
                <div className="flex justify-center">
                  <PlayerProfileEditor playerId={p.playerId} profile={profile} />
                </div>

                {/* Active toggle */}
                {canToggle && (
                  <div className="flex justify-center">
                    <ToggleActiveButton playerId={p.playerId} isActive={p.active} />
                  </div>
                )}
              </div>

              {/* Mobile: stacked layout */}
              <div className="flex items-start gap-3 sm:hidden">
                <div className={[
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold",
                  hasActiveLogin
                    ? "bg-[rgba(20,184,166,0.08)] text-[color:var(--accent)]"
                    : "bg-[rgba(115,145,176,0.08)] text-[color:var(--muted-foreground)]",
                ].join(" ")}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[0.88rem] font-medium text-slate-800">{name}</p>
                    {isFlagged && (
                      <span
                        title="Data flag: player linked to multiple user accounts — check Flags page"
                        className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-amber-500 cursor-help"
                      >
                        ⚑ Flag
                      </span>
                    )}
                  </div>
                  {p.email ? (
                    <p className="truncate text-[0.73rem] text-[color:var(--muted-foreground)]">{p.email}</p>
                  ) : (
                    <p className="text-[0.73rem] italic text-[color:var(--muted-foreground)]">No account</p>
                  )}
                  <PlayerProfileEditor playerId={p.playerId} profile={profile} />
                  {canToggle && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <ToggleActiveButton playerId={p.playerId} isActive={p.active} />
                      {!p.userId && p.active && <SendInviteButton playerId={p.playerId} />}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <GenderBadge gender={p.gender} />
                  <FeeBadge status={feeStatus} />
                  <LoginBadge userId={p.userId} accountStatus={p.accountStatus} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
