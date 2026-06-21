import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { mode, year, teamSlug } = await req.json() as {
    mode?: string;
    year?: number;
    teamSlug?: string;
  };

  if (mode === "refresh") {
    if (year && teamSlug) {
      await mainQuery("SELECT refresh_player_season_stats($1, $2)", [year, teamSlug]);
    } else if (year) {
      await mainQuery("SELECT refresh_player_season_stats($1)", [year]);
    } else {
      await mainQuery("SELECT refresh_player_season_stats()");
    }
    return NextResponse.json({ ok: true });
  }

  if (mode === "archive") {
    // Owner-only — archive is destructive
    if (!user.isOwner) {
      const elevated = new Set(["chairman"]);
      if (![...(user.councilPermissions ?? [])].some((p) => elevated.has(p))) {
        return NextResponse.json({ error: "Forbidden — owner or chairman only" }, { status: 403 });
      }
    }
    if (!year) return NextResponse.json({ error: "year required" }, { status: 400 });
    await mainQuery("SELECT archive_player_season_stats($1, $2)", [year, user.id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "mode must be refresh or archive" }, { status: 400 });
}
