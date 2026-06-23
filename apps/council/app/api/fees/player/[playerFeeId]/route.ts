import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { councilQuery } from "@/db/council-db";
import { deletePlayerFee } from "@/lib/treasurer-queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ playerFeeId: string }> },
) {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerFeeId } = await params;

  // Block removal if any payments have been recorded against this player fee
  const paymentCheck = await councilQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM fee_payments WHERE player_fee_id = $1`,
    [playerFeeId]
  );
  if (parseInt(paymentCheck.rows[0]?.count ?? "0") > 0) {
    return NextResponse.json(
      { error: "Cannot remove a player who has recorded payments. Void all payments first." },
      { status: 409 }
    );
  }

  await deletePlayerFee(playerFeeId);
  return NextResponse.json({ ok: true });
}
