import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { setCaptainForTeam, removeCaptainForTeam } from "@/lib/captain-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, teamId, seasonYear } = await req.json() as {
    userId?: string;
    teamId?: string;
    seasonYear?: number;
  };

  if (!userId || !teamId || !seasonYear) {
    return NextResponse.json({ error: "userId, teamId, seasonYear required" }, { status: 400 });
  }

  await setCaptainForTeam(userId, teamId, seasonYear, user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { teamId, seasonYear } = await req.json() as {
    teamId?: string;
    seasonYear?: number;
  };

  if (!teamId || !seasonYear) {
    return NextResponse.json({ error: "teamId and seasonYear required" }, { status: 400 });
  }

  await removeCaptainForTeam(teamId, seasonYear);
  return NextResponse.json({ ok: true });
}
