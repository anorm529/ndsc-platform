import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { getSeasonById, unenrollPlayer } from "@/lib/season-queries";

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerId, seasonId } = await req.json() as {
    playerId?: string;
    seasonId?: string;
  };

  if (!playerId || !seasonId) {
    return NextResponse.json({ error: "playerId and seasonId required" }, { status: 400 });
  }

  const season = await getSeasonById(seasonId);
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  if (season.status !== "active" && season.status !== "draft") {
    return NextResponse.json({ error: "Cannot unenroll from a closed or archived season" }, { status: 403 });
  }

  await unenrollPlayer(playerId, seasonId);
  return NextResponse.json({ ok: true });
}
