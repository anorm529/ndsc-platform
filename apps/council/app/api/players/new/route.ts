import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { createPlayer, enrollPlayers, getUnenrolledActivePlayers } from "@/lib/season-queries";
import { mainQuery } from "@/lib/main-db";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { displayName, gender, seasonId, enrolledBy, isNew } = await req.json() as {
    displayName?: string;
    gender?: string;
    seasonId?: string;
    enrolledBy?: string;
    isNew?: boolean;
  };

  if (!displayName?.trim() || !seasonId) {
    return NextResponse.json({ error: "displayName and seasonId required" }, { status: 400 });
  }

  let playerId: string;

  if (isNew) {
    // Create a brand new player record
    playerId = await createPlayer(displayName.trim(), gender);
  } else {
    // Search for an existing player by name (case-insensitive)
    const found = await mainQuery<{ id: string }>(
      `SELECT id FROM players
       WHERE lower(display_name) = lower($1) AND active = true
       LIMIT 1`,
      [displayName.trim()]
    );
    if (found.rows[0]) {
      playerId = found.rows[0].id;
    } else {
      // Create if not found
      playerId = await createPlayer(displayName.trim(), gender);
    }
  }

  await enrollPlayers([playerId], seasonId, enrolledBy ?? user.id);

  return NextResponse.json({ ok: true, playerId });
}
