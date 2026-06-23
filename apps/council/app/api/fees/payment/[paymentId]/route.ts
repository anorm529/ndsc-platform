import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasTreasurerAccess } from "@/lib/council-session";
import { voidFeePayment } from "@/lib/treasurer-queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getCouncilUser();
  if (!user || !hasTreasurerAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { paymentId } = await params;
  const body = await req.json() as { reason?: string };
  const reason = body.reason?.trim();

  if (!reason) {
    return NextResponse.json({ error: "A void reason is required" }, { status: 400 });
  }

  await voidFeePayment(paymentId, reason, user.id);
  return NextResponse.json({ ok: true });
}
