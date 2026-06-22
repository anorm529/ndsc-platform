import { NextRequest, NextResponse } from "next/server";
import { requireCouncilUser } from "@/lib/council-session";
import { upsertPlayerProfile } from "@/lib/council-queries";

export async function POST(req: NextRequest) {
  try {
    await requireCouncilUser();
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const yearOfBirth = body.yearOfBirth ? parseInt(body.yearOfBirth, 10) : null;

  await upsertPlayerProfile(body.playerId, {
    yearOfBirth: yearOfBirth && !isNaN(yearOfBirth) ? yearOfBirth : null,
    postcode: body.postcode?.trim() || null,
    isRookie: Boolean(body.isRookie),
    isUmpire: Boolean(body.isUmpire),
    notes: body.notes?.trim() || null,
  });

  return NextResponse.json({ ok: true });
}
