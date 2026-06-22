import Link from "next/link";
import { notFound } from "next/navigation";
import MembersNav from "@/app/members/components/MembersNav";
import TeamHubContent from "@/app/members/components/TeamHubContent";
import { buildMemberProfile, fmtInt, fmtRate } from "@/app/members/lib/memberProfile";
import { requireCurrentUser } from "@/lib/auth";
import { getClubData, getTeamPageData, CLUB_TEAM_SLUGS, type ClubTeamSlug } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

export default async function MyTeamPage({
  searchParams,
}: {
  searchParams?: Promise<{ season?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const user = await requireCurrentUser();
  const clubData = await getClubData();
  const profile = buildMemberProfile(user, clubData);

  if (!profile.activeTeamSlug) return notFound();

  const selectedSeason = sp.season?.trim();
  const playerSeasons = profile.seasonSummaries.map((s) => s.season);

  // "All" — personal career summary across every team and season
  if (!selectedSeason) {
    const seasons = profile.seasonSummaries;
    const bestAvgSeason = seasons.reduce<(typeof seasons)[0] | null>(
      (b, s) => s.avg != null && (b == null || s.avg > (b.avg ?? -Infinity)) ? s : b, null
    );
    const bestOpsSeason = seasons.reduce<(typeof seasons)[0] | null>(
      (b, s) => s.ops != null && (b == null || s.ops > (b.ops ?? -Infinity)) ? s : b, null
    );
    const mostHrSeason = seasons.reduce<(typeof seasons)[0] | null>(
      (b, s) => b == null || s.homeRuns > b.homeRuns ? s : b, null
    );
    const mostRbiSeason = seasons.reduce<(typeof seasons)[0] | null>(
      (b, s) => b == null || s.rbi > b.rbi ? s : b, null
    );
    const mostHitsSeason = seasons.reduce<(typeof seasons)[0] | null>(
      (b, s) => b == null || s.hits > b.hits ? s : b, null
    );
    const mostGamesSeason = seasons.reduce<(typeof seasons)[0] | null>(
      (b, s) => b == null || s.games > b.games ? s : b, null
    );
    const fmtDelta = (v: number) =>
      (v >= 0 ? "+" : "") + v.toFixed(3).replace(/^(-?)0\./, "$1.");
    return (
      <main className="min-h-screen bg-[#0F172A] text-white">
        <MembersNav user={user} />
        <section className="mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8">
          <div className="mt-6 space-y-6">

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/40 bg-teal-500/10 px-4 py-2 text-sm text-teal-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-teal-300" />
                    My Career
                  </span>
                  <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{user.playerName}</h1>
                  <p className="mt-1 text-sm text-slate-300">Current team: {profile.activeTeamName}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-teal-300/40 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-400">
                    All
                  </span>
                  {playerSeasons.map((season) => (
                    <Link
                      key={season}
                      href={`/members/my-team?season=${season}`}
                      className="rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      {season}
                    </Link>
                  ))}
                </div>

                <p className="text-xs text-slate-400">
                  All combines your personal stats across every season and team you have played for. Select a year to see the full team roster for that season.
                </p>
              </div>

              <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-8 text-center">
                <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center opacity-[0.04]">
                  <span className="text-[180px] font-black leading-none text-white">NDSC</span>
                </div>
                <div className="relative">
                  <p className="text-sm font-semibold uppercase tracking-[0.5em] text-slate-500">We Are</p>
                  <p className="mt-1 bg-gradient-to-br from-white to-teal-300 bg-clip-text text-7xl font-black italic tracking-tight text-transparent">
                    NDSC
                  </p>
                  <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
                </div>
              </div>
            </div>

            {profile.seasonSummaries.length ? (
              <>
              {seasons.length > 1 && (
                <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal-400">Team Journey</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[...seasons].reverse().flatMap((s, i, arr) => [
                      <div key={`s-${s.season}`} className="text-center">
                        <div className="text-xs text-slate-500">{s.season}</div>
                        <div className="mt-0.5 rounded-lg border border-[#2B4162] bg-[#0F172A]/60 px-3 py-1.5 text-sm font-semibold text-slate-200">
                          {s.teamNames[0] ?? "—"}
                        </div>
                      </div>,
                      ...(i < arr.length - 1
                        ? [<span key={`a-${s.season}`} className="text-xl leading-none text-slate-600">→</span>]
                        : []),
                    ])}
                  </div>
                </section>
              )}
              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="text-sm font-semibold uppercase tracking-wide text-teal-400">
                  Career Stats
                </div>
                <div className="-mx-6 mt-5 overflow-x-auto px-6">
                  <table className="w-full min-w-[1500px] text-sm [&_th]:border-r [&_th]:border-[#2B4162] [&_td]:border-r [&_td]:border-[#2B4162]">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="pb-3 px-3 text-left">Season</th>
                        <th className="pb-3 px-3 text-left">Team</th>
                        <th className="pb-3 px-3 text-right">GP</th>
                        <th className="pb-3 px-3 text-right">INN</th>
                        <th className="pb-3 px-3 text-right">1B</th>
                        <th className="pb-3 px-3 text-right">2B</th>
                        <th className="pb-3 px-3 text-right">3B</th>
                        <th className="pb-3 px-3 text-right">HR</th>
                        <th className="pb-3 px-3 text-right">BB</th>
                        <th className="pb-3 px-3 text-right">H</th>
                        <th className="pb-3 px-3 text-right">R</th>
                        <th className="pb-3 px-3 text-right">RBI</th>
                        <th className="pb-3 px-3 text-right">AB</th>
                        <th className="pb-3 px-3 text-right">OB</th>
                        <th className="pb-3 px-3 text-right">BO</th>
                        <th className="pb-3 px-3 text-right">UAO</th>
                        <th className="pb-3 px-3 text-right">AO</th>
                        <th className="pb-3 px-3 text-right">OUTS</th>
                        <th className="pb-3 px-3 text-right text-teal-400/80">OBP</th>
                        <th className="pb-3 px-3 text-right text-teal-400/80">AVG</th>
                        <th className="pb-3 px-3 text-right text-teal-400/80">SLG</th>
                        <th className="pb-3 px-3 text-right text-teal-400/80">OPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.seasonSummaries.map((s, i) => {
                        const prev = profile.seasonSummaries[i + 1];
                        const avgDelta = s.avg != null && prev?.avg != null ? s.avg - prev.avg : null;
                        const opsDelta = s.ops != null && prev?.ops != null ? s.ops - prev.ops : null;
                        return (
                          <tr key={s.season} className="border-t border-[#2B4162] transition hover:bg-white/[0.02]">
                            <td className="py-3 px-3 font-semibold text-teal-400">{s.season}</td>
                            <td className="py-3 px-3 text-slate-300">{s.teamNames.join(" & ") || "—"}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.games)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.innings)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.singles)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.doubles)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.triples)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.homeRuns)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.walks)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.hits)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.runs)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.rbi)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.atBats)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.ob)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.batterOut)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.uao)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.ao)}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-200">{fmtInt(s.outs)}</td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">{fmtRate(s.obp)}</td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-mono tabular-nums text-slate-200">{fmtRate(s.avg)}</div>
                              {avgDelta != null && (
                                <div className={`text-[10px] tabular-nums ${avgDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {fmtDelta(avgDelta)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">{fmtRate(s.slg)}</td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-semibold tabular-nums text-teal-300">{fmtRate(s.ops)}</div>
                              {opsDelta != null && (
                                <div className={`text-[10px] tabular-nums ${opsDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {fmtDelta(opsDelta)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-teal-400/30">
                        <td className="py-3 px-3 font-bold text-teal-300">Career</td>
                        <td className="py-3 px-3 text-xs text-slate-500">All teams</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.games)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.innings)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.singles)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.doubles)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.triples)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.homeRuns)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.walks)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.hits)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.runs)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.rbi)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.atBats)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.ob)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.batterOut)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.uao)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.ao)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">{fmtInt(profile.career.outs)}</td>
                        <td className="py-3 px-3 text-right font-bold font-mono tabular-nums">{fmtRate(profile.career.obp)}</td>
                        <td className="py-3 px-3 text-right font-bold font-mono tabular-nums">{fmtRate(profile.career.avg)}</td>
                        <td className="py-3 px-3 text-right font-bold font-mono tabular-nums">{fmtRate(profile.career.slg)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-teal-300">{fmtRate(profile.career.ops)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {(
                  [
                    { label: "GP", value: fmtInt(profile.career.games), teal: false },
                    { label: "H", value: fmtInt(profile.career.hits), teal: false },
                    { label: "HR", value: fmtInt(profile.career.homeRuns), teal: false },
                    { label: "RBI", value: fmtInt(profile.career.rbi), teal: false },
                    { label: "AVG", value: fmtRate(profile.career.avg), teal: false },
                    { label: "OPS", value: fmtRate(profile.career.ops), teal: true },
                  ] as { label: string; value: string; teal: boolean }[]
                ).map(({ label, value, teal }) => (
                  <div key={label} className="rounded-xl border border-[#2B4162] bg-[#1D2E48] p-4 text-center">
                    <div className={`text-2xl font-bold tabular-nums ${teal ? "text-teal-300" : "text-white"}`}>{value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  </div>
                ))}
              </div>

              {seasons.length > 1 && (
                <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                  <div className="text-sm font-semibold uppercase tracking-wide text-teal-400">Personal Bests</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(
                      [
                        { label: "Best AVG", value: fmtRate(bestAvgSeason?.avg), season: bestAvgSeason },
                        { label: "Best OPS", value: fmtRate(bestOpsSeason?.ops), season: bestOpsSeason },
                        { label: "Most HR", value: fmtInt(mostHrSeason?.homeRuns), season: mostHrSeason },
                        { label: "Most RBI", value: fmtInt(mostRbiSeason?.rbi), season: mostRbiSeason },
                        { label: "Most Hits", value: fmtInt(mostHitsSeason?.hits), season: mostHitsSeason },
                        { label: "Most GP", value: fmtInt(mostGamesSeason?.games), season: mostGamesSeason },
                      ] as { label: string; value: string; season: (typeof seasons)[0] | null }[]
                    ).map(({ label, value, season }) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-[#2B4162] bg-[#0F172A]/60 px-4 py-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                        <div className="text-right">
                          <div className="font-mono font-semibold tabular-nums text-white">{value}</div>
                          {season && (
                            <div className="text-xs text-slate-500">
                              {season.season}{season.teamNames[0] ? ` · ${season.teamNames[0]}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {profile.career.hits > 0 && (
                <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                  <div className="text-sm font-semibold uppercase tracking-wide text-teal-400">Hit Breakdown</div>
                  <div className="mt-4">
                    <div className="flex h-5 w-full overflow-hidden rounded-full">
                      {[
                        { count: profile.career.singles, color: "bg-slate-400" },
                        { count: profile.career.doubles, color: "bg-teal-400" },
                        { count: profile.career.triples, color: "bg-amber-400" },
                        { count: profile.career.homeRuns, color: "bg-rose-400" },
                      ].map(({ count, color }, idx) => (
                        <div
                          key={idx}
                          className={color}
                          style={{ width: `${(count / profile.career.hits) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {[
                        { label: "Singles", count: profile.career.singles, dot: "bg-slate-400", text: "text-slate-300" },
                        { label: "Doubles", count: profile.career.doubles, dot: "bg-teal-400", text: "text-teal-300" },
                        { label: "Triples", count: profile.career.triples, dot: "bg-amber-400", text: "text-amber-300" },
                        { label: "Home Runs", count: profile.career.homeRuns, dot: "bg-rose-400", text: "text-rose-300" },
                      ].map(({ label, count, dot, text }) => (
                        <div key={label} className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-sm ${dot}`} />
                            <span className="text-xs text-slate-400">{label}</span>
                          </div>
                          <div className={`mt-1 text-xl font-bold tabular-nums ${text}`}>{count}</div>
                          <div className="text-xs text-slate-500">
                            {Math.round((count / profile.career.hits) * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              </>
            ) : (
              <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 text-sm text-slate-400">
                No stats linked to your player record yet.
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  // Season view — full team hub for the team the player was on that year
  let teamSlug: ClubTeamSlug = profile.activeTeamSlug;
  const stat = profile.playerStats.find((s) => String(s.season ?? "") === selectedSeason);
  const slug = stat?.teamSlug;
  if (slug && (CLUB_TEAM_SLUGS as readonly string[]).includes(slug)) {
    teamSlug = slug as ClubTeamSlug;
  }

  const teamData = await getTeamPageData(teamSlug, selectedSeason);
  if (!teamData) return notFound();

  return (
    <TeamHubContent
      teamData={{ ...teamData, availableSeasons: playerSeasons }}
      user={user}
      basePath="/members/my-team"
    />
  );
}
