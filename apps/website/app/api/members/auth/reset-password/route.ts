import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  try {
    await resetPasswordWithToken(String(body.token ?? ""), String(body.password ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reset password.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
