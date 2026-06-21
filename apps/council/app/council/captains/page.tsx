import { Shield } from "lucide-react";
import { requireCouncilUser } from "@/lib/council-session";
import { getAllActivePlayers, playerDisplayName, type PlayerRow } from "@/lib/main-db";
import { getPlayerProfiles, getCurrentFeeStatuses, type PlayerProfile, type PlayerFeeStatus } from "@/lib/council-queries";

export default async function CaptainsPage() {
  const user = await requireCouncilUser();

  const [allPlayers, profileMap, feeStatusMap] = await Promise.all([
    getAllActivePlayers(),
    getPlayerProfiles(),
    getCurrentFeeStatuses(),
  ]);

  // Group players by their team name from the main stats DB
  const teamGroups = new Map<string, PlayerRow[]>();
  const unassigned: PlayerRow[] = [];

  for (const p of allPlayers) {
    if (!p.teamName) {
      unassigned.push(p);
    } else {
      const list = teamGroups.get(p.teamName) ?? [];
      list.push(p);
      teamGroups.set(p.teamName, list);
    }
  }

  const teamEntries = Array.from(teamGroups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-4xl space-y-6">
      {teamEntries.length === 0 ? (
        <div className="council-panel rounded-2xl border p-8 text-center text-[0.9rem] text-[color:var(--muted-foreground)]">
          No teams found in the stats database.
        </div>
      ) : (
        teamEntries.map(([teamName, roster]) => {
          const female = roster
            .filter((p) => p.gender?.toLowerCase() === "female")
            .sort((a, b) => playerDisplayName(a).localeCompare(playerDisplayName(b)));
          const male = roster
            .filter((p) => p.gender?.toLowerCase() === "male")
            .sort((a, b) => playerDisplayName(a).localeCompare(playerDisplayName(b)));
          const other = roster
            .filter((p) => !p.gender || !["male", "female"].includes(p.gender.toLowerCase()))
            .sort((a, b) => playerDisplayName(a).localeCompare(playerDisplayName(b)));

          return (
            <section key={teamName} className="council-panel rounded-2xl border p-5">
              <div className="mb-5 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[color:var(--accent)]" />
                <h2 className="text-[0.95rem] font-semibold text-slate-800">{teamName}</h2>
                <span className="ml-auto rounded-full bg-[rgba(20,184,166,0.1)] px-2.5 py-0.5 text-[0.7rem] text-[color:var(--accent)]">
                  {roster.length} {roster.length === 1 ? "player" : "players"}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-[rgba(232,74,165,0.12)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#E84AA5]">
                      Female
                    </span>
                    <span className="text-[0.7rem] text-[color:var(--muted-foreground)]">{female.length}</span>
                  </div>
                  {female.length === 0 ? (
                    <p className="text-[0.8rem] italic text-[color:var(--muted-foreground)]">None assigned</p>
                  ) : (
                    <ul className="space-y-1">
                      {female.map((p) => (
                        <RosterRow key={p.playerId} player={p} profile={profileMap.get(p.playerId) ?? null} feeStatus={feeStatusMap.get(p.playerId) ?? null} />
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-[rgba(30,208,216,0.12)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#1ED0D8]">
                      Male
                    </span>
                    <span className="text-[0.7rem] text-[color:var(--muted-foreground)]">{male.length}</span>
                  </div>
                  {male.length === 0 ? (
                    <p className="text-[0.8rem] italic text-[color:var(--muted-foreground)]">None assigned</p>
                  ) : (
                    <ul className="space-y-1">
                      {male.map((p) => (
                        <RosterRow key={p.playerId} player={p} profile={profileMap.get(p.playerId) ?? null} feeStatus={feeStatusMap.get(p.playerId) ?? null} />
                      ))}
                    </ul>
                  )}
                </div>

                {other.length > 0 && (
                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-[rgba(115,145,176,0.1)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[color:var(--muted-foreground)]">
                        Unknown gender
                      </span>
                      <span className="text-[0.7rem] text-[color:var(--muted-foreground)]">{other.length}</span>
                    </div>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {other.map((p) => (
                        <RosterRow key={p.playerId} player={p} profile={profileMap.get(p.playerId) ?? null} feeStatus={feeStatusMap.get(p.playerId) ?? null} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          );
        })
      )}

      {unassigned.length > 0 && (
        <section className="council-panel rounded-2xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <h2 className="text-[0.95rem] font-semibold text-slate-800">No team assigned</h2>
            <span className="ml-auto rounded-full bg-[rgba(115,145,176,0.1)] px-2.5 py-0.5 text-[0.7rem] text-[color:var(--muted-foreground)]">
              {unassigned.length}
            </span>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {unassigned
              .sort((a, b) => playerDisplayName(a).localeCompare(playerDisplayName(b)))
              .map((p) => (
                <RosterRow key={p.playerId} player={p} profile={profileMap.get(p.playerId) ?? null} feeStatus={feeStatusMap.get(p.playerId) ?? null} />
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RosterRow({ player, profile, feeStatus }: {
  player: PlayerRow;
  profile: PlayerProfile | null;
  feeStatus: PlayerFeeStatus | null;
}) {
  const name = playerDisplayName(player);
  return (
    <li className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-slate-50/60 px-3 py-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(20,184,166,0.08)] text-[0.7rem] font-semibold text-[color:var(--accent)]">
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="flex-1 text-[0.82rem] font-medium text-slate-800">{name}</span>
      <div className="flex items-center gap-1">
        {profile?.isRookie && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-600">R</span>
        )}
        {profile?.isUmpire && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[0.6rem] font-medium text-blue-600">U</span>
        )}
        {feeStatus ? (
          feeStatus.status === "paid" ? (
            <span className="rounded bg-[rgba(16,185,129,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--success)]">Paid</span>
          ) : feeStatus.status === "partial" ? (
            <span className="rounded bg-[rgba(233,185,62,0.12)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--warning)]">Part</span>
          ) : (
            <span className="rounded bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[color:var(--danger)]">Due</span>
          )
        ) : null}
      </div>
    </li>
  );
}
