import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { createFixture, deleteFixture } from "@/lib/fixtures-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { teamId, seasonId, opponent, scheduledAt, homeAway, location, latitude, longitude } = await req.json() as {
    teamId?: string; seasonId?: string; opponent?: string;
    scheduledAt?: string; homeAway?: string; location?: string;
    latitude?: number | null; longitude?: number | null;
  };

  if (!teamId || !seasonId || !opponent || !scheduledAt || !homeAway) {
    return NextResponse.json({ error: "teamId, seasonId, opponent, scheduledAt, homeAway required" }, { status: 400 });
  }

  const id = await createFixture({ teamId, seasonId, opponent, scheduledAt, homeAway, location, latitude, longitude });
  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deleteFixture(id);
  return NextResponse.json({ ok: true });
}
