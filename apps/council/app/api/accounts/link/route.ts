import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser } from "@/lib/council-session";
import { linkPlayerToUser } from "@/lib/account-queries";

const ELEVATED = new Set(["chairman", "vice_chair"]);

function isElevated(user: NonNullable<Awaited<ReturnType<typeof getCouncilUser>>>) {
  return user.isOwner || [...user.councilPermissions].some((p) => ELEVATED.has(p));
}

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !isElevated(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, playerId } = await req.json() as { userId?: string; playerId?: string };
  if (!userId || !playerId) {
    return NextResponse.json({ error: "userId and playerId required" }, { status: 400 });
  }

  await linkPlayerToUser(userId, playerId, user.id);
  return NextResponse.json({ ok: true });
}
