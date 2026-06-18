import { NextResponse } from "next/server";
import { changePassword, requireCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await requireCurrentUser();
  const body = await req.json().catch(() => ({}));

  try {
    await changePassword(
      user.id,
      String(body.currentPassword ?? ""),
      String(body.newPassword ?? "")
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not change password.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
