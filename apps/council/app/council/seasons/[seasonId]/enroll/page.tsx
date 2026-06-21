import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CopyCheck } from "lucide-react";
import { requireCouncilUser, requireRosterManagementAccess } from "@/lib/council-session";
import {
  getSeasonById,
  getPreviousSeasonPlayers,
  getUnenrolledActivePlayers,
  enrollPlayers,
  enrollPlayersWithTeams,
} from "@/lib/season-queries";
import { CarryForwardForm } from "./carry-forward-form";

export default async function EnrollPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const user = await requireCouncilUser();
  await requireRosterManagementAccess(user);

  const season = await getSeasonById(seasonId);
  if (!season) notFound();
  if (season.status === "closed" || season.status === "archived") {
    redirect(`/council/seasons/${seasonId}`);
  }

  const [prevPlayers, unenrolled] = await Promise.all([
    getPreviousSeasonPlayers(season.year),
    getUnenrolledActivePlayers(seasonId),
  ]);

  // Carry-forward server action
  async function handleCarryForward(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    await requireRosterManagementAccess(u);

    const raw = formData.getAll("playerIds");
    const playerIds = raw.map(String).filter(Boolean);
    if (playerIds.length === 0) return;

    await enrollPlayers(playerIds, seasonId, u.id);
    redirect(`/council/seasons/${seasonId}`);
  }

  // Enroll all unenrolled active players
  async function handleEnrollAll(formData: FormData) {
    "use server";
    const u = await requireCouncilUser();
    await requireRosterManagementAccess(u);

    const all = await getUnenrolledActivePlayers(seasonId);
    await enrollPlayers(all.map((p) => p.playerId), seasonId, u.id);
    redirect(`/council/seasons/${seasonId}`);
  }

  // Copy ALL previous season players to this season, preserving team assignments
  async function handleCopyWithTeams() {
    "use server";
    const u = await requireCouncilUser();
    await requireRosterManagementAccess(u);

    const prev = await getPreviousSeasonPlayers(season!.year);
    await enrollPlayersWithTeams(
      prev.map((p) => ({ playerId: p.playerId, teamId: p.prevTeamId })),
      seasonId,
      u.id
    );
    redirect(`/council/seasons/${seasonId}`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/council/seasons/${seasonId}`}
        className="flex items-center gap-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {season.year} Season
      </Link>

      {/* Quick: copy previous season with team assignments intact */}
      {prevPlayers.length > 0 && prevPlayers.some((p) => p.prevTeamId) && (
        <div className="council-panel rounded-2xl border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CopyCheck className="h-4 w-4 text-[color:var(--accent)]" />
                <h3 className="text-[0.92rem] font-semibold text-slate-800">
                  Copy {season.year - 1} with same teams
                </h3>
              </div>
              <p className="mt-1 text-[0.8rem] text-[color:var(--muted-foreground)]">
                Enrolls all {prevPlayers.length} returning players and keeps them on their existing teams.
                Already-enrolled players are not affected.
              </p>
            </div>
            <form action={handleCopyWithTeams}>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-[linear-gradient(180deg,#0d9488_0%,#0f766e_100%)] px-4 py-2 text-[0.82rem] font-medium text-white hover:brightness-105"
              >
                Copy all
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Carry forward from previous season */}
      {prevPlayers.length > 0 ? (
        <CarryForwardForm
          prevPlayers={prevPlayers}
          season={season}
          onCarryForward={handleCarryForward}
        />
      ) : (
        <div className="council-panel rounded-2xl border p-6 text-[0.88rem] text-[color:var(--muted-foreground)]">
          No previous season data found to carry forward from.
        </div>
      )}

      {/* Quick: enroll all active players */}
      {unenrolled.length > 0 && (
        <div className="council-panel rounded-2xl border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[0.92rem] font-semibold text-slate-800">Enroll all active players</h3>
              <p className="mt-1 text-[0.8rem] text-[color:var(--muted-foreground)]">
                {unenrolled.length} active player{unenrolled.length !== 1 ? "s" : ""} not yet in this season
              </p>
            </div>
            <form action={handleEnrollAll}>
              <button
                type="submit"
                className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-[0.82rem] text-[color:var(--muted-foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                Enroll all
              </button>
            </form>
          </div>
        </div>
      )}

      {unenrolled.length === 0 && prevPlayers.length === 0 && (
        <div className="council-panel rounded-2xl border p-8 text-center text-[color:var(--muted-foreground)]">
          All active players are already enrolled in this season.
        </div>
      )}
    </div>
  );
}
