import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { createStanding, updateStanding, deleteStanding } from "@/lib/standings-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { team, year, division, wins, losses, points, runs_for, runs_against, streak, position } = body;
  if (!team || !year) {
    return NextResponse.json({ error: "team and year are required" }, { status: 400 });
  }
  const id = await createStanding({
    team,
    year: Number(year),
    division: division || null,
    wins: Number(wins ?? 0),
    losses: Number(losses ?? 0),
    points: points != null ? Number(points) : undefined,
    runs_for: Number(runs_for ?? 0),
    runs_against: Number(runs_against ?? 0),
    streak: streak || null,
    position: position ? Number(position) : null,
  });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { id, team, year, division, wins, losses, points, runs_for, runs_against, streak, position } = body;
  if (!id || !team || !year) {
    return NextResponse.json({ error: "id, team and year are required" }, { status: 400 });
  }
  await updateStanding(id, {
    team,
    year: Number(year),
    division: division || null,
    wins: Number(wins ?? 0),
    losses: Number(losses ?? 0),
    points: points != null ? Number(points) : undefined,
    runs_for: Number(runs_for ?? 0),
    runs_against: Number(runs_against ?? 0),
    streak: streak || null,
    position: position ? Number(position) : null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteStanding(id);
  return NextResponse.json({ ok: true });
}
