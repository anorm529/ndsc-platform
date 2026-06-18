import { BadgeCheck, LockKeyhole } from "lucide-react";
import MembersNav from "@/app/members/components/MembersNav";
import {
  buildMemberProfile,
  sortAchievementsByTier,
  type Achievement,
  type AchievementTier,
} from "@/app/members/lib/memberProfile";
import { getPlayerProfile, requireCurrentUser } from "@/lib/auth";
import { getClubData } from "@/lib/ndsc-data";

export const dynamic = "force-dynamic";

function tierClass(tier: AchievementTier) {
  if (tier === "platinum") return "border-sky-200/40 bg-sky-300/15 text-sky-100";
  if (tier === "gold") return "border-amber-200/40 bg-amber-300/15 text-amber-100";
  if (tier === "silver") return "border-slate-200/35 bg-slate-200/15 text-slate-100";
  return "border-orange-200/35 bg-orange-300/15 text-orange-100";
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const pct = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));

  return (
    <div className={`rounded-2xl border p-5 ${tierClass(achievement.tier)} ${achievement.unlocked ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide">{achievement.tier}</div>
          <div className="mt-2 text-xl font-semibold">{achievement.title}</div>
          <div className="mt-1 text-sm text-slate-300">{achievement.detail}</div>
        </div>
        {achievement.unlocked ? <BadgeCheck /> : <LockKeyhole />}
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/25">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {achievement.progress}/{achievement.target}
      </div>
    </div>
  );
}

export default async function AchievementsPage() {
  const user = await requireCurrentUser();
  const [clubData, playerProfile] = await Promise.all([
    getClubData(),
    getPlayerProfile(user.playerId),
  ]);
  const profile = buildMemberProfile(user, clubData, playerProfile);
  const unlocked = profile.achievements
    .filter((achievement) => achievement.unlocked)
    .sort(sortAchievementsByTier);
  const locked = profile.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort(sortAchievementsByTier);

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <MembersNav user={user} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h1 className="text-3xl font-semibold">Achievements</h1>
        <p className="mt-2 text-slate-400">Automatically calculated from linked player stats, game logs and awards.</p>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-teal-400">Unlocked</h2>
              <p className="mt-1 text-sm text-slate-500">Highest-tier achievements first.</p>
            </div>
            <div className="rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-300">
              {unlocked.length}/{profile.achievements.length}
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {unlocked.length ? (
              unlocked.map((achievement) => <AchievementCard key={achievement.title} achievement={achievement} />)
            ) : (
              <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 text-slate-400">
                No achievements unlocked yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div>
            <h2 className="text-xl font-semibold text-white">Locked</h2>
            <p className="mt-1 text-sm text-slate-500">Long-term targets and next milestones.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {locked.map((achievement) => (
              <AchievementCard key={achievement.title} achievement={achievement} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
