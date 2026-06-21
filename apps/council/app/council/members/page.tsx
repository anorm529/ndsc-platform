import { Users, UserCheck, Filter, LogIn, UserX } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getAllActivePlayers, playerDisplayName, type PlayerRow } from "@/lib/main-db";
import { getAllTeams, getMemberTeamMap, getCaptainTeamIds, getMembersOnTeam } from "@/lib/team-queries";
import { getPlayerProfiles, getCurrentFeeStatuses, type PlayerProfile, type PlayerFeeStatus } from "@/lib/council-queries";
import { PlayerProfileEditor } from "./player-profile-editor";

export default async function MembersPage() {
  const user = await requireCouncilUser();
  const isCapt = !user.isOwner && user.councilPermissions.has("captain") &&
                 !user.councilPermissions.has("treasurer") &&
                 !user.councilPermissions.has("secretary");

  const [allPlayers, allTeams, memberTeamMap, profileMap, feeStatusMap] = await Promise.all([
    getAllActivePlayers(),
    getAllTeams(),
    getMemberTeamMap(),
    getPlayerProfiles(),
    getCurrentFeeStatuses(),
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

  const visiblePlayers = scopedUserIds
    ? allPlayers.filter((p) => p.userId && scopedUserIds!.has(p.userId))
    : allPlayers;

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

  const withLogin = allPlayers.filter((p) => p.userId && p.accountStatus === "active").length;
  const noLogin = allPlayers.filter((p) => !p.userId).length;

  return (
    <div className="max-w-4xl space-y-6">
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
            <PlayerList players={players} profileMap={profileMap} feeStatusMap={feeStatusMap} />
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
          <PlayerList players={unassigned} profileMap={profileMap} feeStatusMap={feeStatusMap} />
        </section>
      )}

      {visiblePlayers.length === 0 && (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          {isCapt ? "No members assigned to your team yet." : "No active players found."}
        </div>
      )}
    </div>
  );
}

function PlayerList({ players, profileMap, feeStatusMap }: {
  players: PlayerRow[];
  profileMap: Map<string, PlayerProfile>;
  feeStatusMap: Map<string, PlayerFeeStatus>;
}) {
  return (
    <ul className="divide-y divide-[color:var(--border)]">
      {players.map((p) => {
        const name = playerDisplayName(p);
        const hasActiveLogin = p.userId && p.accountStatus === "active";
        const hasPendingLogin = p.userId && p.accountStatus === "pending";
        const profile = profileMap.get(p.playerId) ?? null;
        const feeStatus = feeStatusMap.get(p.playerId) ?? null;

        return (
          <li key={p.playerId} className="py-3">
            <div className="flex items-start gap-3">
              <div className={[
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold",
                hasActiveLogin
                  ? "bg-[rgba(20,184,166,0.08)] text-[color:var(--accent)]"
                  : "bg-[rgba(115,145,176,0.08)] text-[color:var(--muted-foreground)]",
              ].join(" ")}>
                {name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[0.88rem] font-medium text-slate-800">{name}</p>
                {p.email ? (
                  <p className="truncate text-[0.73rem] text-[color:var(--muted-foreground)]">{p.email}</p>
                ) : (
                  <p className="text-[0.73rem] italic text-[color:var(--muted-foreground)]">No account</p>
                )}
                <PlayerProfileEditor playerId={p.playerId} profile={profile} />
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {p.teamName ? (
                    <span className="rounded-full bg-[rgba(43,34,84,0.08)] px-2 py-0.5 text-[0.65rem] font-medium text-[#2B2254]">
                      {p.teamName}
                    </span>
                  ) : null}
                  {p.gender?.toLowerCase() === "female" ? (
                    <span className="rounded-full bg-[rgba(232,74,165,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[#E84AA5]">F</span>
                  ) : p.gender?.toLowerCase() === "male" ? (
                    <span className="rounded-full bg-[rgba(30,208,216,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[#1ED0D8]">M</span>
                  ) : null}
                </div>
                {feeStatus ? (
                feeStatus.status === "paid" ? (
                  <span className="rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--success)]">Fees paid</span>
                ) : feeStatus.status === "partial" ? (
                  <span className="rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--warning)]">Part paid</span>
                ) : (
                  <span className="rounded-full bg-[rgba(239,68,68,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--danger)]">Fees due</span>
                )
              ) : null}
              {hasActiveLogin ? (
                  <span className="rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--success)]">
                    Active login
                  </span>
                ) : hasPendingLogin ? (
                  <span className="rounded-full bg-[rgba(233,185,62,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--warning)]">
                    Pending login
                  </span>
                ) : (
                  <span className="rounded-full bg-[rgba(115,145,176,0.1)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--muted-foreground)]">
                    No login
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
