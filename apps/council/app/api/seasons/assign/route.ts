import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { assignToTeam, getSeasonById } from "@/lib/season-queries";
import { getCaptainTeamIdsForSeason } from "@/lib/captain-queries";

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

  const canManage = hasRosterManagementAccess(user);

  if (!canManage) {
    // Captains may only assign players to/from their own team
    const season = await getSeasonById(seasonId);
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

    const captainTeamIds = await getCaptainTeamIdsForSeason(user.id, season.year);
    if (captainTeamIds.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Captain can only assign to one of their teams or back to unassigned (null)
    if (teamId !== null && teamId !== undefined && !captainTeamIds.includes(teamId)) {
      return NextResponse.json({ error: "Forbidden — not your team" }, { status: 403 });
    }
  }

  await assignToTeam(playerId, seasonId, teamId ?? null, user.id, notes);
  return NextResponse.json({ ok: true });
}
