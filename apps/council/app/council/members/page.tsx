import { Users, UserCheck, Filter } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getAllActiveMembers, memberDisplayName } from "@/lib/main-db";
import { getAllTeams, getMemberTeamMap, getCaptainTeamIds, getMembersOnTeam } from "@/lib/team-queries";

export default async function MembersPage() {
  const user = await requireCouncilUser();
  const isCapt = !user.isOwner && user.councilPermissions.has("captain") &&
                 !user.councilPermissions.has("treasurer") &&
                 !user.councilPermissions.has("secretary");

  const [allMembers, allTeams, memberTeamMap] = await Promise.all([
    getAllActiveMembers(),
    getAllTeams(),
    getMemberTeamMap(),
  ]);

  // Captain scoping: filter to only their teams' members
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

  const visibleMembers = scopedUserIds
    ? allMembers.filter((m) => scopedUserIds!.has(m.id))
    : allMembers;

  // Build team name map
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  // Group by team for display
  const teamGroups = new Map<string, typeof visibleMembers>();
  const unassigned: typeof visibleMembers = [];

  for (const member of visibleMembers) {
    const teamIds = memberTeamMap.get(member.id) ?? [];
    if (teamIds.length === 0) {
      unassigned.push(member);
    } else {
      for (const tid of teamIds) {
        const existing = teamGroups.get(tid) ?? [];
        existing.push(member);
        teamGroups.set(tid, existing);
      }
    }
  }

  const teamEntries = Array.from(teamGroups.entries()).sort(([a], [b]) => {
    const nameA = teamById.get(a)?.name ?? "";
    const nameB = teamById.get(b)?.name ?? "";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[color:var(--accent)]" />
          <p className="text-[0.9rem] text-[color:var(--muted-foreground)]">
            <span className="font-semibold text-white">{visibleMembers.length}</span> active members
            {isCapt ? " on your team" : ""}
          </p>
        </div>
        {isCapt ? (
          <span className="flex items-center gap-1.5 rounded-full bg-[color:var(--accent-muted)] px-3 py-1 text-[0.72rem] font-medium text-[color:var(--accent)]">
            <Filter className="h-3 w-3" />
            Captain view
          </span>
        ) : null}
      </div>

      {/* Team groups */}
      {teamEntries.map(([teamId, members]) => {
        const team = teamById.get(teamId);
        return (
          <section key={teamId} className="council-panel rounded-2xl border p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[color:var(--accent)]" />
              <h2 className="text-[0.92rem] font-semibold text-white">
                {team?.name ?? "Unknown Team"}
              </h2>
              <span className="ml-auto rounded-full bg-[rgba(29,215,207,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
                {members.length} {members.length === 1 ? "player" : "players"}
              </span>
            </div>
            <ul className="divide-y divide-[color:var(--border)]">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(29,215,207,0.08)] text-[0.8rem] font-semibold text-[color:var(--accent)]">
                    {memberDisplayName(m).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium text-white">
                      {memberDisplayName(m)}
                    </p>
                    <p className="truncate text-[0.73rem] text-[color:var(--muted-foreground)]">
                      {m.email}
                    </p>
                  </div>
                  {m.playerId ? (
                    <span className="shrink-0 rounded-full bg-[rgba(24,213,141,0.1)] px-2 py-0.5 text-[0.65rem] text-[color:var(--success)]">
                      Linked
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Unassigned members */}
      {unassigned.length > 0 ? (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <h2 className="text-[0.92rem] font-semibold text-white">No team assigned</h2>
            <span className="ml-auto rounded-full bg-[rgba(115,145,176,0.1)] px-2 py-0.5 text-[0.7rem] text-[color:var(--muted-foreground)]">
              {unassigned.length}
            </span>
          </div>
          <ul className="divide-y divide-[color:var(--border)]">
            {unassigned.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(115,145,176,0.08)] text-[0.8rem] font-semibold text-[color:var(--muted-foreground)]">
                  {memberDisplayName(m).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.88rem] font-medium text-white">
                    {memberDisplayName(m)}
                  </p>
                  <p className="truncate text-[0.73rem] text-[color:var(--muted-foreground)]">
                    {m.email}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visibleMembers.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          {isCapt ? "No members assigned to your team yet." : "No active members found."}
        </div>
      ) : null}
    </div>
  );
}
