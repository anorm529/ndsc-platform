import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { updateFixtureResult } from "@/lib/fixtures-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  // Owners can always update; chairs/vice chairs and captains can update results
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const elevated = new Set(["chairman", "vice_chair", "captain"]);
  const hasAccess = user.isOwner || [...(user.councilPermissions ?? [])].some((p) => elevated.has(p));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, runsFor, runsAgainst } = await req.json() as {
    id?: string; runsFor?: number; runsAgainst?: number;
  };

  if (!id || runsFor === undefined || runsAgainst === undefined) {
    return NextResponse.json({ error: "id, runsFor, runsAgainst required" }, { status: 400 });
  }

  await updateFixtureResult({ id, runsFor, runsAgainst });
  return NextResponse.json({ ok: true });
}
