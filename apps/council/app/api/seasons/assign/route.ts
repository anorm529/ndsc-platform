import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { assignToTeam, getSeasonById } from "@/lib/season-queries";
import { getCaptainTeamIdsForSeason } from "@/lib/captain-queries";
import { mainQuery } from "@/lib/main-db";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { playerId, seasonId, teamId, notes } = await req.json() as {
    playerId?: string;
    seasonId?: string;
    teamId?: string | null;
    notes?: string;
  };

  if (!playerId || !seasonId) {
    return NextResponse.json({ error: "playerId and seasonId required" }, { status: 400 });
  }

  const season = await getSeasonById(seasonId);
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  if (season.status !== "active") {
    return NextResponse.json({ error: "Season is not active" }, { status: 403 });
  }

  const canManage = hasRosterManagementAccess(user);

  // Captains are blocked when transfers are locked; council management can always override
  if (season.transfersLocked && !canManage) {
    return NextResponse.json({ error: "Transfers are locked for this season" }, { status: 403 });
  }

  if (!canManage) {
    const captainTeamIds = await getCaptainTeamIdsForSeason(user.id, season.year);
    if (captainTeamIds.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Captain can only assign TO their own team or back to unassigned
    if (teamId !== null && teamId !== undefined && !captainTeamIds.includes(teamId)) {
      return NextResponse.json({ error: "Forbidden — not your team" }, { status: 403 });
    }

    // Captain can only move players currently on their own team or unassigned
    const enrollment = await mainQuery<{ current_team_id: string | null }>(
      `SELECT current_team_id FROM season_enrollments WHERE player_id = $1 AND season_id = $2`,
      [playerId, seasonId]
    );
    const currentTeamId = enrollment.rows[0]?.current_team_id ?? null;
    if (currentTeamId !== null && !captainTeamIds.includes(currentTeamId)) {
      return NextResponse.json({ error: "Forbidden — not your player" }, { status: 403 });
    }
  }

  await assignToTeam(playerId, seasonId, teamId ?? null, user.id, notes);
  return NextResponse.json({ ok: true });
}
