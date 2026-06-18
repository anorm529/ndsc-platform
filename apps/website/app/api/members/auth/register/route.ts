import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  try {
    await registerUser({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
