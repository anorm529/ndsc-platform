import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { upsertPlayerFee, deletePlayerFee, type FeeType } from "@/lib/treasurer-queries";

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.playerId || !body?.seasonId || !body?.playerName || !body?.feeType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes: FeeType[] = ["player", "rookie", "umpire", "custom"];
  if (!validTypes.includes(body.feeType)) {
    return NextResponse.json({ error: "Invalid fee type" }, { status: 400 });
  }

  const amountDue = parseFloat(body.amountDue);
  if (isNaN(amountDue) || amountDue < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const id = await upsertPlayerFee({
    playerId: body.playerId,
    userId: body.userId || null,
    playerName: body.playerName,
    seasonId: body.seasonId,
    feeType: body.feeType as FeeType,
    amountDue,
    notes: body.notes || undefined,
  });

  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deletePlayerFee(id);
  return NextResponse.json({ ok: true });
}
