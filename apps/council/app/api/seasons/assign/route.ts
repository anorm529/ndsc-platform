import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { assignToTeam } from "@/lib/season-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerId, seasonId, teamId, notes } = await req.json() as {
    playerId?: string;
    seasonId?: string;
    teamId?: string | null;
    notes?: string;
  };

  if (!playerId || !seasonId) {
    return NextResponse.json({ error: "playerId and seasonId required" }, { status: 400 });
  }

  await assignToTeam(playerId, seasonId, teamId ?? null, user.id, notes);
  return NextResponse.json({ ok: true });
}
