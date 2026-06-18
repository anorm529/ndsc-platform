import { NextResponse } from "next/server";
import { destroyOtherSessions, requireCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await requireCurrentUser();
  await destroyOtherSessions(user.id);
  return NextResponse.json({ ok: true });
}
