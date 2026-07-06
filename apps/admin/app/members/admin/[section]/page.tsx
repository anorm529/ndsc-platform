import { notFound } from "next/navigation";
import { BarChart3, CheckCircle2, CircleDashed } from "lucide-react";
import { NeonTableAdmin } from "@/components/admin/neon-table-admin";
import { SectionCard } from "@/components/admin/section-card";
import { requireAdminPermission } from "@/lib/permissions";
import {
  getNeonAdminSection,
  getGameStatsUploadOverview,
  getPlayersOverview,
  getTableAdminData,
  type GameStatsUploadOverviewTeam,
  type PlayerOverviewEntry,
} from "@/lib/neon-admin";
import { archiveSeasonStatsAction, refreshSeasonStatsAction } from "@/app/members/admin/actions";

function formatGameDate(value: string | null) {
  if (!value) {
    return "Date TBC";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function GameStatsUploadOverview({
  teams,
}: {
  teams: GameStatsUploadOverviewTeam[];
}) {
  if (teams.length === 0) {
    return null;
  }

  const totals = teams.reduce(
    (summary, team) => ({
      totalGames: summary.totalGames + team.totalGames,
      uploadedGames: summary.uploadedGames + team.uploadedGames,
      totalStatRows: summary.totalStatRows + team.totalStatRows,
    }),
    { totalGames: 0, uploadedGames: 0, totalStatRows: 0 },
  );

  return (
    <section className="admin-panel rounded-[1.5rem] p-5">
      <div className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
            Uploaded game stats overview
          </h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {totals.uploadedGames} of {totals.totalGames} fixtures have player stat rows.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[360px]">
          <div className="rounded-lg border border-[color:var(--border)] bg-[#061321]/70 px-3 py-2">
            <div className="text-lg font-semibold text-white">{totals.uploadedGames}</div>
            <div className="text-[#93a0b3]">Uploaded</div>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[#061321]/70 px-3 py-2">
            <div className="text-lg font-semibold text-white">{totals.totalGames - totals.uploadedGames}</div>
            <div className="text-[#93a0b3]">Missing</div>
          </div>
          <div className="rounded-lg border border-[color:var(--border)] bg-[#061321]/70 px-3 py-2">
            <div className="text-lg font-semibold text-white">{totals.totalStatRows}</div>
            <div className="text-[#93a0b3]">Rows</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {teams.map((team) => (
          <div key={team.team} className="rounded-xl border border-[color:var(--border)] bg-[#061321]/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{team.team}</h3>
                <p className="text-xs text-[#93a0b3]">
                  {team.uploadedGames}/{team.totalGames} games uploaded
                </p>
              </div>
              <span className="rounded-full border border-[color:var(--border-strong)] px-2.5 py-1 text-xs font-semibold text-[#dce5f2]">
                {team.totalStatRows} rows
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {team.games.map((game) => {
                const uploaded = game.statRows > 0;

                return (
                  <div
                    key={`${game.year}-${game.team}-${game.opponent}-${game.gameDate}-${game.homeAway}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#020913]/70 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[#dce5f2]">
                        {formatGameDate(game.gameDate)} · {game.homeAway} vs {game.opponent}
                      </div>
                      <div className="text-xs text-[#93a0b3]">{game.statRows} player rows</div>
                    </div>
                    {uploaded ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
                    ) : (
                      <CircleDashed className="h-4 w-4 shrink-0 text-[#f5c26b]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupPlayersByTeam(entries: PlayerOverviewEntry[]) {
  const map = new Map<string, PlayerOverviewEntry[]>();
  for (const entry of entries) {
    const key = entry.teamName ?? "Unassigned";
    const existing = map.get(key) ?? [];
    existing.push(entry);
    map.set(key, existing);
  }
  return Array.from(map.entries()).sort(([a], [b]) =>
    a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
  );
}

function PlayerStatusGroup({
  label,
  entries,
  tone,
}: {
  label: string;
  entries: PlayerOverviewEntry[];
  tone: "success" | "muted";
}) {
  const groups = groupPlayersByTeam(entries);
  const uniqueCount = new Set(entries.map((e) => e.id)).size;
  const dotClass =
    tone === "success"
      ? "bg-[color:var(--success)]"
      : "bg-[color:var(--muted-foreground)]";

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#dce5f2]">
          {label}
          <span className="ml-2 text-xs font-normal text-[#93a0b3]">({uniqueCount})</span>
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(([teamName, teamPlayers]) => (
          <div
            key={teamName}
            className="rounded-xl border border-[color:var(--border)] bg-[#061321]/70 p-4"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--accent)]">
              {teamName}
              <span className="ml-1.5 font-normal text-[#93a0b3]">
                ({new Set(teamPlayers.map((p) => p.id)).size})
              </span>
            </p>
            <ul className="space-y-1">
              {teamPlayers.map((p) => (
                <li key={p.id} className="truncate text-sm text-[#dce5f2]">
                  {p.displayName}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersOverview({ players }: { players: PlayerOverviewEntry[] }) {
  if (players.length === 0) return null;

  const activePlayers = players.filter((p) => p.active);
  const inactivePlayers = players.filter((p) => !p.active);

  return (
    <section className="admin-panel rounded-[1.5rem] p-5">
      <h2 className="mb-1 text-xl font-semibold tracking-[-0.03em] text-white">Player status overview</h2>
      <p className="mb-6 text-sm text-[color:var(--muted-foreground)]">
        Grouped by global active status and most recent team assignment.
      </p>
      <div className="space-y-8">
        <PlayerStatusGroup label="Active" entries={activePlayers} tone="success" />
        {inactivePlayers.length > 0 && (
          <PlayerStatusGroup label="Inactive" entries={inactivePlayers} tone="muted" />
        )}
      </div>
    </section>
  );
}

export default async function NeonAdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await requireAdminPermission("database");
  const { section: sectionSlug } = await params;
  const section = getNeonAdminSection(sectionSlug);

  if (!section || section.slug === "uploads") {
    notFound();
  }

  const [tables, gameStatsOverview, playersOverview] = await Promise.all([
    Promise.all(
      section.tables.map((tableName) =>
        getTableAdminData(
          tableName,
          section.slug === "game-stats" ? { rowLimit: null } : undefined,
        ),
      ),
    ),
    section.slug === "game-stats" ? getGameStatsUploadOverview() : Promise.resolve([]),
    section.slug === "players" ? getPlayersOverview() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <SectionCard
        title={section.label}
        subtitle={section.description}
        icon={BarChart3}
        iconClassName="text-[color:var(--accent)]"
      >
        {section.slug === "eos-stats" ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <form action={refreshSeasonStatsAction} className="admin-panel-soft rounded-xl p-4">
              <h2 className="font-semibold text-white">Refresh generated stats</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  name="year"
                  placeholder="Year optional"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
                <input
                  name="teamSlug"
                  placeholder="Team slug optional"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
              </div>
              <button className="mt-4 h-10 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d]">
                Run refresh
              </button>
            </form>

            <form action={archiveSeasonStatsAction} className="admin-panel-soft rounded-xl p-4">
              <h2 className="font-semibold text-white">Archive completed season</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  name="year"
                  placeholder="Year"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
                <input
                  name="archivedBy"
                  placeholder="Archived by"
                  defaultValue="admin"
                  className="h-10 rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white"
                />
              </div>
              <button className="mt-4 h-10 rounded-full border border-[color:var(--border-strong)] px-5 text-sm font-semibold text-white">
                Archive
              </button>
            </form>
          </div>
        ) : null}
      </SectionCard>

      {section.slug === "game-stats" ? <GameStatsUploadOverview teams={gameStatsOverview} /> : null}

      {section.slug === "players" ? <PlayersOverview players={playersOverview} /> : null}

      {tables.map((table) => (
        <NeonTableAdmin
          key={table.tableName}
          table={table}
          collapsibleGroups={section.slug === "game-stats"}
          hiddenColumns={section.slug === "game-stats" ? ["id"] : []}
        />
      ))}
    </div>
  );
}
