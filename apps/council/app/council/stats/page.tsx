import Link from "next/link";
import { BarChart2, Calendar, Home, Navigation } from "lucide-react";
import { requireCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getRecentGamesWithStats } from "@/lib/stats-queries";
import { getAllTeams, getAllSeasons } from "@/lib/season-queries";
import { StatsUploadForm } from "./upload-form";
import { EosStatsPanel } from "./eos-form";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function StatsPage() {
  const user = await requireCouncilUser();
  const canManage = hasRosterManagementAccess(user);
  const [seasons, teams] = await Promise.all([getAllSeasons(), getAllTeams()]);
  const activeSeason = seasons.find((s) => s.status === "active") ?? seasons[0] ?? null;
  const recentGames = await getRecentGamesWithStats(25, activeSeason?.id);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Upload section — owners and elevated roles only */}
      {canManage && <StatsUploadForm />}

      {!canManage && (
        <div className="council-panel rounded-2xl border p-6 text-center text-[color:var(--muted-foreground)]">
          <BarChart2 className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-[0.9rem]">Stats uploads require chairman or owner access.</p>
        </div>
      )}

      {/* EOS Stats — refresh and archive */}
      {canManage && <EosStatsPanel teams={teams} />}

      {/* Recent games */}
      <section className="council-panel rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-[color:var(--accent)]" />
          <h3 className="text-[0.92rem] font-semibold text-slate-800">Recent games</h3>
          {activeSeason && (
            <span className="rounded-full bg-[rgba(20,184,166,0.08)] px-2 py-0.5 text-[0.68rem] text-[color:var(--accent)]">
              {activeSeason.year} season
            </span>
          )}
          <span className="ml-auto text-[0.72rem] text-[color:var(--muted-foreground)]">
            last {recentGames.length}
          </span>
        </div>

        {recentGames.length === 0 ? (
          <p className="py-4 text-center text-[0.82rem] italic text-[color:var(--muted-foreground)]">
            No games with stats found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8rem]">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Team</th>
                  <th className="pb-2 pr-4">Opponent</th>
                  <th className="pb-2 pr-4">H/A</th>
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 text-right">Stats rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {recentGames.map((game) => (
                  <tr key={game.id} className="group hover:bg-slate-50/50">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/council/stats/games/${game.id}`}
                        className="text-slate-600 group-hover:text-teal-600"
                      >
                        {formatDate(game.gameDate)}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 font-medium text-slate-800">{game.teamName}</td>
                    <td className="py-2 pr-4 text-slate-700">{game.opponent}</td>
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-1 text-[color:var(--muted-foreground)]">
                        {game.homeAway?.toLowerCase() === "home" ? (
                          <Home className="h-3 w-3" />
                        ) : (
                          <Navigation className="h-3 w-3" />
                        )}
                        {game.homeAway}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{game.year}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/council/stats/games/${game.id}`}
                        className={[
                          "rounded px-1.5 py-0.5 text-[0.68rem] font-medium",
                          game.statRows > 0
                            ? "bg-[rgba(16,185,129,0.1)] text-[color:var(--success)] hover:bg-[rgba(16,185,129,0.2)]"
                            : "bg-[rgba(233,185,62,0.1)] text-[color:var(--warning)] hover:bg-[rgba(233,185,62,0.2)]",
                        ].join(" ")}
                      >
                        {game.statRows}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
