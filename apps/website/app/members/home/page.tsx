import Link from "next/link";
import Image from "next/image";
import {
  Award,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Medal,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import MembersNav from "@/app/members/components/MembersNav";
import {
  buildMemberProfile,
  fmtInt,
  fmtRate,
  sortAchievementsByTier,
  type AchievementTier,
} from "@/app/members/lib/memberProfile";
import { getPlayerProfile, requireCurrentUser } from "@/lib/auth";
import { getClubData, type Match } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function tierClass(tier: AchievementTier) {
  if (tier === "platinum") return "border-sky-200/40 bg-sky-300/15 text-sky-100";
  if (tier === "gold") return "border-amber-200/40 bg-amber-300/15 text-amber-100";
  if (tier === "silver") return "border-slate-200/35 bg-slate-200/15 text-slate-100";
  return "border-orange-200/35 bg-orange-300/15 text-orange-100";
}

function StatCard({ label, value, sub, compact }: { label: string; value: string; sub?: string; compact?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5">
      <div className="min-h-8 text-xs font-semibold uppercase tracking-wide text-teal-400/70">{label}</div>
      <div className={`mt-2 overflow-hidden whitespace-nowrap font-semibold leading-tight text-white ${compact ? "text-[clamp(0.875rem,1.6vw,1.5rem)]" : "text-[clamp(1rem,2.4vw,2.25rem)]"}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function formatMatch(match?: Match) {
  if (!match) return "—";
  const date = match.date
    ? new Date(match.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "TBC";
  return `${date} vs ${match.opponent}`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-teal-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function playerRating(ops: number | null | undefined) {
  return Math.min(99, Math.max(1, Math.round((ops ?? 0.6) * 35)));
}

export default async function MembersHomePage() {
  const user = await requireCurrentUser();
  const [clubData, playerProfile] = await Promise.all([
    getClubData(),
    getPlayerProfile(user.playerId),
  ]);
  const profile = buildMemberProfile(user, clubData, playerProfile);
  const unlockedCount = profile.achievements.filter((achievement) => achievement.unlocked).length;
  const featuredAchievements = [
    ...profile.achievements.filter((achievement) => achievement.unlocked).sort(sortAchievementsByTier),
    ...profile.achievements.filter((achievement) => !achievement.unlocked).sort(sortAchievementsByTier),
  ].slice(0, 4);
  const missingProfileFields = [
    ["Position", playerProfile.position],
    ["Bats", playerProfile.bats],
    ["Throws", playerProfile.throws],
  ]
    .filter(([, value]) => !value || String(value).trim() === "")
    .map(([label]) => label);
  const chartMax = Math.max(1, ...profile.seasonSummaries.map((season) => season.ops ?? 0));

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="self-start rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-teal-400">
                  Player Profile
                </div>
                <h1 className="mt-3 text-4xl font-semibold leading-tight">{user.playerName}</h1>
                <div className="mt-2 text-lg text-slate-300">{profile.activeTeamName}</div>
              </div>
              {playerProfile.profileImageUrl ? (
                <Image
                  src={playerProfile.profileImageUrl}
                  alt=""
                  width={112}
                  height={112}
                  unoptimized
                  className="h-28 w-28 rounded-2xl border border-teal-200/30 object-cover"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-2xl border border-teal-200/30 bg-teal-300/15 text-3xl font-bold text-teal-300">
                  {playerRating(profile.career.ops)}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Member Since</span>
                <span className="font-semibold">{playerProfile.memberSince ?? profile.seasonSummaries.at(-1)?.season ?? "—"}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Position</span>
                <span className="font-semibold">{playerProfile.position ?? "—"}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Shirt Number</span>
                <span className="font-semibold">{playerProfile.shirtNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Bats / Throws</span>
                <span className="font-semibold">
                  {playerProfile.bats ?? "—"} / {playerProfile.throws ?? "—"}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Division</span>
                <span className="font-semibold">{profile.activeTeamDivision ?? "—"}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold">{playerProfile.membershipStatus}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-700/40 px-4 py-3">
                <span className="text-slate-400">Achievements</span>
                <span className="font-semibold">{unlockedCount}/{profile.achievements.length}</span>
              </div>
            </div>

            {missingProfileFields.length ? (
              <div className="mt-5 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4">
                <div className="text-sm font-semibold text-amber-100">Complete your player profile</div>
                <div className="mt-1 text-sm text-slate-300">
                  Add {missingProfileFields.join(", ")} to unlock the profile completion achievement.
                </div>
                <Link
                  href="/members/account"
                  className="mt-3 inline-flex rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-[#0F172A]"
                >
                  Update profile
                </Link>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/members/my-team" className="rounded-xl bg-teal-300 px-4 py-3 text-center text-sm font-semibold text-[#0F172A]">
                My Team
              </Link>
              <Link href="/members/awards" className="rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-3 text-center text-sm font-semibold text-white">
                Awards
              </Link>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <StatCard label="Career Games" value={fmtInt(profile.career.games)} />
              <StatCard label="Career Hits" value={fmtInt(profile.career.hits)} />
              <StatCard label="Career RBI" value={fmtInt(profile.career.rbi)} />
              <StatCard label="Career Runs" value={fmtInt(profile.career.runs)} />
              <StatCard label="Career AVG" value={fmtRate(profile.career.avg)} />
              <StatCard label="Career OPS" value={fmtRate(profile.career.ops)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                      <BarChart3 size={16} />
                      Current Season
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold">{profile.currentSeason?.season ?? "No season stats yet"}</h2>
                  </div>
                  <div className="flex gap-2">
                    {profile.rankings.map((ranking) => (
                      <div key={ranking.label} className="rounded-xl border border-teal-200/25 bg-teal-300/10 px-4 py-2 text-center">
                        <div className="text-lg font-semibold text-teal-300">{ranking.value}</div>
                        <div className="text-xs text-slate-500">{ranking.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard compact label="Games" value={fmtInt(profile.currentSeason?.games)} />
                  <StatCard compact label="AVG" value={fmtRate(profile.currentSeason?.avg)} sub={`Team: ${fmtRate(profile.teamAverages.avg)}`} />
                  <StatCard compact label="OBP" value={fmtRate(profile.currentSeason?.obp)} sub={`Team: ${fmtRate(profile.teamAverages.obp)}`} />
                  <StatCard compact label="OPS" value={fmtRate(profile.currentSeason?.ops)} sub={`Team: ${fmtRate(profile.teamAverages.ops)}`} />
                </div>

                <div className="mt-7">
                  <div className="text-sm font-semibold text-slate-200">Season OPS comparison</div>
                  <div className="mt-4 space-y-3">
                    {profile.seasonSummaries.length ? (
                      profile.seasonSummaries.map((season) => (
                        <div key={season.season} className="grid grid-cols-[72px_1fr_64px] items-center gap-3">
                          <div className="text-sm text-slate-400">{season.season}</div>
                          <div className="h-8 overflow-hidden rounded-xl bg-slate-700/50">
                            <div
                              className="h-full rounded-xl bg-gradient-to-r from-teal-300 to-sky-300"
                              style={{ width: `${Math.max(4, ((season.ops ?? 0) / chartMax) * 100)}%` }}
                            />
                          </div>
                          <div className="text-right text-sm font-semibold">{fmtRate(season.ops)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-[#2B4162] bg-slate-700/30 p-4 text-sm text-slate-400">
                        No season stats are linked to this player yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <CalendarDays size={16} />
                  This Week
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-[#2B4162] bg-slate-700/40 p-4">
                    <div className="text-xs text-slate-500">Next team fixture</div>
                    <div className="mt-1 font-semibold">{formatMatch(profile.upcomingTeamMatches[0])}</div>
                  </div>
                  <div className="rounded-xl border border-[#2B4162] bg-slate-700/40 p-4">
                    <div className="text-xs text-slate-500">Latest team result</div>
                    <div className="mt-1 font-semibold">{formatMatch(profile.recentTeamResults[0])}</div>
                  </div>
                  <Link href="/members/this-week" className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0F172A]">
                    Club weekly view
                  </Link>
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <Trophy size={16} />
                  Award Cabinet
                </div>
                <div className="mt-5 space-y-3">
                  {profile.awards.slice(0, 4).map((award, index) => (
                    <div key={`${award.year}-${award.award}-${index}`} className="rounded-xl border border-amber-200/20 bg-amber-300/10 p-4">
                      <div className="font-semibold text-amber-100">{award.award}</div>
                      <div className="text-sm text-slate-400">{award.year}{award.team ? ` • ${award.team}` : ""}</div>
                    </div>
                  ))}
                  {!profile.awards.length ? <div className="text-sm text-slate-400">No awards linked yet.</div> : null}
                </div>
              </section>

              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <Medal size={16} />
                  Achievements
                </div>
                <div className="mt-5 space-y-3">
                  {featuredAchievements.map((achievement) => (
                    <div key={achievement.title} className={cn("rounded-xl border p-4", tierClass(achievement.tier), !achievement.unlocked && "opacity-55")}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{achievement.title}</div>
                        {achievement.unlocked ? <BadgeCheck size={18} /> : <Sparkles size={18} />}
                      </div>
                      <ProgressBar value={achievement.progress} max={achievement.target} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <Award size={16} />
                  Personal Records
                </div>
                <div className="mt-5 space-y-3">
                  {profile.personalRecords.map((record) => (
                    <div key={record.label} className="flex items-center justify-between rounded-xl border border-[#2B4162] bg-slate-700/40 px-4 py-3">
                      <span className="text-sm text-slate-400">{record.label}</span>
                      <span className="font-semibold">{record.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                <Shield size={16} />
                Career Timeline
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {profile.timeline.length ? (
                  profile.timeline.map((entry) => (
                    <div key={`${entry.year}-${entry.label}`} className="rounded-xl border border-[#2B4162] bg-slate-700/40 p-4">
                      <div className="text-sm font-semibold text-teal-400">{entry.year}</div>
                      <div className="mt-1 text-sm text-slate-200">{entry.label}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">Milestones will appear as stats and awards are linked.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
