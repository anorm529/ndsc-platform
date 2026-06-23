import Link from "next/link";
import CountdownBar from "@/app/members/components/CountdownBar";
import MembersNav from "@/app/members/components/MembersNav";
import MatchHistory from "@/app/members/components/MatchHistory";
import PlayerStatsTable from "@/app/members/components/PlayerStatsTable";
import TeamAnalytics from "@/app/members/components/TeamAnalyticsWrapper";
import TeamSwitcher from "@/app/members/components/TeamSwitcher";
import type { AuthenticatedUser } from "@/lib/auth";
import type { Match, TeamPageData } from "@/lib/ndsc-data";

function isBlank(v: unknown) {
  return v === null || v === undefined || String(v).trim() === "";
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatResult(m?: Match) {
  if (!m || isBlank(m.result)) return "—";
  const rf = m.runsFor;
  const ra = m.runsAgainst;
  const score = typeof rf === "number" && typeof ra === "number" ? ` ${rf}-${ra}` : "";
  return `${String(m.result).toUpperCase()}${score}`;
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/40 bg-teal-500/10 px-4 py-2 text-sm text-teal-400">
      {children}
    </span>
  );
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TeamHubContent({
  teamData,
  user,
  basePath,
  additionalSection,
}: {
  teamData: TeamPageData;
  user: AuthenticatedUser;
  basePath?: string;
  additionalSection?: React.ReactNode;
}) {
  const {
    slug,
    selectedSeason: seasonParam,
    availableSeasons,
    players,
    division,
    awardsLookup,
    gameDataLookup,
    nextMatch,
    lastResult,
    matches,
    teamAvg,
    chartRows,
  } = teamData;

  // Deduplicate seasons (my-team deduplicates itself, but team pages may not)
  const deduplicatedSeasons = [...new Set(availableSeasons)];
  // Hide upcoming-fixture UI when a specific past season is selected.
  // Fixtures are team-wide (not season-scoped), so an archived season would otherwise
  // show future games that have nothing to do with that historical view.
  const isCurrentSeason = !seasonParam || seasonParam === deduplicatedSeasons[0];
  const activeNextMatch = isCurrentSeason ? nextMatch : undefined;
  const matchLat = numOrNull(activeNextMatch?.lat);
  const matchLon = numOrNull(activeNextMatch?.lon);
  const base = basePath ?? `/members/teams/${slug}`;

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <MembersNav user={user} />

      <section className="py-14">
        <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1700px] px-4 md:px-8">
          <div className="mt-6 grid gap-6 lg:grid-cols-[420px_340px_1fr] items-stretch">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Pill>
                    <span className="inline-block h-2 w-2 rounded-full bg-teal-300" />
                    Team Hub
                  </Pill>
                  {user.role === "owner" && <TeamSwitcher />}
                </div>

                <h1 className="text-3xl md:text-4xl font-semibold text-white">
                  {teamData.team.name}
                </h1>

                <p className="text-slate-300 text-sm">
                  {division ? `${division} • ` : ""}
                  Players: {players.length}
                  {seasonParam ? ` • Season: ${seasonParam}` : ""}
                </p>
              </div>

              <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                {isCurrentSeason ? (
                  <>
                    <div className="text-sm text-slate-300">Next fixture</div>
                    {activeNextMatch ? (
                      <>
                        <div className="mt-1 text-lg font-semibold">
                          vs {activeNextMatch.opponent}
                        </div>
                        <div className="text-sm text-slate-300">
                          {new Date(activeNextMatch.date).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {activeNextMatch.homeAway ? ` • ${activeNextMatch.homeAway}` : ""}
                          {activeNextMatch.location ? ` • ${activeNextMatch.location}` : ""}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-1 text-lg font-semibold">No upcoming fixture</div>
                        <div className="text-sm text-slate-400">
                          Add a future game with blank result for {slug}.
                        </div>
                      </>
                    )}
                    {lastResult ? (
                      <div className="pt-3 text-xs text-slate-400">
                        Last result: {formatResult(lastResult)} vs {lastResult.opponent} (
                        {new Date(lastResult.date).toLocaleDateString("en-GB")})
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="text-sm text-slate-300">Season</div>
                    <div className="mt-1 text-lg font-semibold text-slate-200">{seasonParam}</div>
                    <div className="mt-1 text-sm text-slate-400">Historical view — no upcoming fixtures.</div>
                    {lastResult ? (
                      <div className="pt-3 text-xs text-slate-400">
                        Last result: {formatResult(lastResult)} vs {lastResult.opponent} (
                        {new Date(lastResult.date).toLocaleDateString("en-GB")})
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={base}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                    !seasonParam
                      ? "border-teal-300/40 bg-teal-500/10 text-teal-400"
                      : "border-slate-600 bg-[#1D2E48] text-white hover:bg-slate-700"
                  )}
                >
                  All
                </Link>

                {deduplicatedSeasons.map((season) => (
                  <Link
                    key={season}
                    href={`${base}?season=${season}`}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                      seasonParam === season
                        ? "border-teal-300/40 bg-teal-500/10 text-teal-400"
                        : "border-slate-600 bg-[#1D2E48] text-white hover:bg-slate-700"
                    )}
                  >
                    {season}
                  </Link>
                ))}
              </div>

              {!seasonParam ? (
                <p className="text-xs text-slate-400">
                  All combines each player&apos;s totals across every uploaded season, then
                  recalculates stats like AVG, OBP, SLG, and OPS from those combined totals.
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Season view shows only the uploaded stats for {seasonParam}.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-slate-700/40 p-6 h-full flex flex-col">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Countdown
              </div>
              <div className="mt-3 flex-1 flex flex-col justify-center">
                {activeNextMatch?.date ? (
                  <div className="w-full">
                    <CountdownBar targetISO={activeNextMatch.date} progressWindowHours={168} />
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">
                    {isCurrentSeason ? "No upcoming fixture." : "Historical season — no countdown."}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2B4162] bg-slate-700/40 p-6">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Location
              </div>

              {matchLat != null && matchLon != null ? (
                <>
                  <div className="mt-3 overflow-hidden rounded-xl border border-[#2B4162]">
                    <iframe
                      title="Match location"
                      className="h-[220px] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${matchLat},${matchLon}&z=15&output=embed`}
                    />
                  </div>
                  <div className="mt-3">
                    <a
                      className="text-sm font-semibold text-teal-300 hover:text-teal-400"
                      href={`https://www.google.com/maps?q=${matchLat},${matchLon}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </>
              ) : (
                <div className="mt-3 text-sm text-slate-400">
                  Add <span className="text-white">latitude</span> /{" "}
                  <span className="text-white">longitude</span> to the match in Neon to show a map.
                </div>
              )}
            </div>
          </div>

          <PlayerStatsTable
            players={players}
            awardsLookup={awardsLookup}
            gameDataLookup={gameDataLookup}
            currentPlayerName={user.playerName}
            currentPlayerId={user.playerId ?? undefined}
            emptyMessage={
              <>
                No players found for {titleCase(slug)}
                {seasonParam ? ` in ${seasonParam}` : ""}. Check your database values for{" "}
                <span className="text-white">team slug</span>
                {seasonParam ? (
                  <>
                    {" "}
                    and <span className="text-white">season</span>
                  </>
                ) : null}
                .
              </>
            }
          />

          <TeamAnalytics
            rows={chartRows}
            teamAvg={teamAvg}
            seasonLabel={seasonParam ? `Season ${seasonParam}` : "All"}
          />

          <MatchHistory matches={matches} />

          {additionalSection}
        </div>
      </section>
    </main>
  );
}
