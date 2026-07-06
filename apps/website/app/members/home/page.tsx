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
  TrendingUp,
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
import { getClubData } from "@/lib/ndsc-data";

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5">
      <div className="min-h-8 text-xs font-semibold uppercase tracking-wide text-teal-400/70">{label}</div>
      <div className="mt-2 overflow-hidden whitespace-nowrap text-[clamp(1rem,2.4vw,2.25rem)] font-semibold leading-tight text-white">
        {value}
      </div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-teal-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmtFixtureDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

  const unlockedCount = profile.achievements.filter((a) => a.unlocked).length;
  const featuredAchievements = [
    ...profile.achievements.filter((a) => a.unlocked).sort(sortAchievementsByTier),
    ...profile.achievements.filter((a) => !a.unlocked).sort(sortAchievementsByTier),
  ].slice(0, 4);
  const missingProfileFields = [
    ["Position", playerProfile.position],
    ["Bats", playerProfile.bats],
    ["Throws", playerProfile.throws],
  ]
    .filter(([, v]) => !v || String(v).trim() === "")
    .map(([label]) => label);

  const opsMax = Math.max(0.001, ...profile.seasonSummaries.map((s) => s.ops ?? 0));
  const avgMax = Math.max(0.001, ...profile.seasonSummaries.map((s) => s.avg ?? 0));
  const nextFixture = profile.upcomingTeamMatches[0];

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">

          {/* Sidebar */}
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
                <span className="font-semibold">
                  {playerProfile.memberSince ?? profile.seasonSummaries.at(-1)?.season ?? "—"}
                </span>
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
                <span className="font-semibold">{unlockedCount} / {profile.achievements.length}</span>
              </div>
            </div>

            {nextFixture && (
              <div className="mt-5 rounded-xl border border-[#2B4162] bg-slate-700/30 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays size={12} />
                  Next fixture
                </div>
                <div className="mt-2 font-semibold">
                  {nextFixture.date ? fmtFixtureDate(nextFixture.date) : "TBC"} vs {nextFixture.opponent}
                </div>
                <Link
                  href="/members/my-team"
                  className="mt-2 inline-flex text-xs font-semibold text-teal-400 hover:text-teal-300"
                >
                  Team schedule →
                </Link>
              </div>
            )}

            {missingProfileFields.length > 0 && (
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
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/members/my-team"
                className="rounded-xl bg-teal-300 px-4 py-3 text-center text-sm font-semibold text-[#0F172A]"
              >
                My Team
              </Link>
              <Link
                href="/members/awards"
                className="rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Awards
              </Link>
            </div>
          </aside>

          {/* Main */}
          <div className="space-y-6">

            {/* Career totals */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <StatCard label="Career Games" value={fmtInt(profile.career.games)} />
              <StatCard label="Career Hits" value={fmtInt(profile.career.hits)} />
              <StatCard label="Career RBI" value={fmtInt(profile.career.rbi)} />
              <StatCard label="Career Runs" value={fmtInt(profile.career.runs)} />
              <StatCard label="Career AVG" value={fmtRate(profile.career.avg)} />
              <StatCard label="Career OPS" value={fmtRate(profile.career.ops)} />
            </div>

            {/* Season history table */}
            <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                <BarChart3 size={16} />
                Season History
              </div>

              {profile.seasonSummaries.length ? (
                <div className="-mx-6 mt-5 overflow-x-auto px-6">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="pb-3 pr-4">Season</th>
                        <th className="pb-3 pr-6">Team</th>
                        <th className="pb-3 pr-4 text-right">G</th>
                        <th className="pb-3 pr-4 text-right">H</th>
                        <th className="pb-3 pr-4 text-right">RBI</th>
                        <th className="pb-3 pr-4 text-right">R</th>
                        <th className="pb-3 pr-4 text-right">BB</th>
                        <th className="pb-3 pr-4 text-right">HR</th>
                        <th className="pb-3 pr-4 text-right">AVG</th>
                        <th className="pb-3 text-right">OPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.seasonSummaries.map((s, i) => (
                        <tr
                          key={`${s.season}-${s.teamSlugs[0] ?? i}`}
                          className="border-t border-[#2B4162] transition hover:bg-white/[0.02]"
                        >
                          <td className="py-3 pr-4 font-semibold text-teal-400">{s.season}</td>
                          <td className="py-3 pr-6 text-slate-300">
                            {s.teamNames.join(" & ") || "—"}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{fmtInt(s.games)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{fmtInt(s.hits)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{fmtInt(s.rbi)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{fmtInt(s.runs)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{fmtInt(s.walks)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{fmtInt(s.homeRuns)}</td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-200">{fmtRate(s.avg)}</td>
                          <td className="py-3 text-right font-semibold tabular-nums">{fmtRate(s.ops)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-teal-400/30">
                        <td className="py-3 pr-4 font-bold text-teal-300">Career</td>
                        <td className="py-3 pr-6 text-xs text-slate-500">All seasons</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{fmtInt(profile.career.games)}</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{fmtInt(profile.career.hits)}</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{fmtInt(profile.career.rbi)}</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{fmtInt(profile.career.runs)}</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{fmtInt(profile.career.walks)}</td>
                        <td className="py-3 pr-4 text-right font-bold tabular-nums">{fmtInt(profile.career.homeRuns)}</td>
                        <td className="py-3 pr-4 text-right font-bold font-mono tabular-nums">{fmtRate(profile.career.avg)}</td>
                        <td className="py-3 text-right font-bold tabular-nums text-teal-300">{fmtRate(profile.career.ops)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-[#2B4162] bg-slate-700/30 p-4 text-sm text-slate-400">
                  No season stats are linked to this player yet.
                </div>
              )}
            </section>

            {/* Career progression — only rendered when there are 2+ seasons to compare */}
            {profile.seasonSummaries.length > 1 && (
              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <TrendingUp size={16} />
                  Career Progression
                </div>
                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-4 rounded-full bg-teal-400" />
                    OPS
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-4 rounded-full bg-sky-400/70" />
                    AVG
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  {[...profile.seasonSummaries].reverse().map((s, i) => (
                    <div key={`${s.season}-${s.teamSlugs[0] ?? i}`} className="grid grid-cols-[56px_1fr] items-center gap-4">
                      <div className="text-xs text-slate-400">{s.season}</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-700/50">
                            <div
                              className="h-full rounded-full bg-teal-400"
                              style={{ width: `${Math.max(2, ((s.ops ?? 0) / opsMax) * 100)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs font-semibold tabular-nums text-teal-300">
                            {fmtRate(s.ops)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-700/50">
                            <div
                              className="h-full rounded-full bg-sky-400/70"
                              style={{ width: `${Math.max(2, ((s.avg ?? 0) / avgMax) * 100)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs font-semibold tabular-nums text-sky-300">
                            {fmtRate(s.avg)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Awards + Personal Records */}
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <Trophy size={16} />
                  Award Cabinet
                </div>
                <div className="mt-5 space-y-3">
                  {profile.awards.slice(0, 5).map((award, i) => (
                    <div
                      key={`${award.year}-${award.award}-${i}`}
                      className="rounded-xl border border-amber-200/20 bg-amber-300/10 p-4"
                    >
                      <div className="font-semibold text-amber-100">{award.award}</div>
                      <div className="text-sm text-slate-400">
                        {award.year}{award.team ? ` · ${award.team}` : ""}
                      </div>
                    </div>
                  ))}
                  {!profile.awards.length && (
                    <div className="text-sm text-slate-400">No awards linked yet.</div>
                  )}
                  {profile.awards.length > 5 && (
                    <Link
                      href="/members/awards"
                      className="mt-1 inline-flex text-sm font-semibold text-teal-400 hover:text-teal-300"
                    >
                      View all {profile.awards.length} awards →
                    </Link>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <Award size={16} />
                  Personal Records
                </div>
                <div className="mt-5 space-y-3">
                  {profile.personalRecords.map((record) => (
                    <div
                      key={record.label}
                      className="flex items-center justify-between rounded-xl border border-[#2B4162] bg-slate-700/40 px-4 py-3"
                    >
                      <span className="text-sm text-slate-400">{record.label}</span>
                      <span className="font-semibold">{record.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Achievements */}
            <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                  <Medal size={16} />
                  Achievements
                </div>
                <span className="text-sm text-slate-400">
                  {unlockedCount} / {profile.achievements.length} unlocked
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {featuredAchievements.map((a) => (
                  <div
                    key={a.title}
                    className={cn("rounded-xl border p-4", tierClass(a.tier), !a.unlocked && "opacity-55")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{a.title}</div>
                      {a.unlocked ? <BadgeCheck size={18} /> : <Sparkles size={18} />}
                    </div>
                    <ProgressBar value={a.progress} max={a.target} />
                  </div>
                ))}
              </div>
              <Link
                href="/members/achievements"
                className="mt-4 inline-flex text-sm font-semibold text-teal-400 hover:text-teal-300"
              >
                View all achievements →
              </Link>
            </section>

            {/* Career Timeline */}
            <section className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-400">
                <Shield size={16} />
                Career Timeline
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {profile.timeline.length ? (
                  profile.timeline.map((entry) => (
                    <div
                      key={`${entry.year}-${entry.label}`}
                      className="rounded-xl border border-[#2B4162] bg-slate-700/40 p-4"
                    >
                      <div className="text-sm font-semibold text-teal-400">{entry.year}</div>
                      <div className="mt-1 text-sm text-slate-200">{entry.label}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-sm text-slate-400">
                    Milestones will appear as stats and awards are linked.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
