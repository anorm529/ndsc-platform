import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { createAward, deleteAward } from "@/lib/awards-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { seasonId, teamId, playerId, playerText, award, notes } = body;
  if (!award) return NextResponse.json({ error: "award is required" }, { status: 400 });
  const id = await createAward({ seasonId, teamId, playerId, playerText, award, notes });
  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteAward(id);
  return NextResponse.json({ ok: true });
}
