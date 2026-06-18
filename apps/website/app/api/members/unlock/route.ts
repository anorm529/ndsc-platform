import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const correct = process.env.MEMBERS_PIN;

  if (!correct) {
    return NextResponse.json({ ok: false, error: "PIN not configured" }, { status: 500 });
  }

  if (String(pin).trim() !== String(correct).trim()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Cookie-based access (7 days)
  res.cookies.set("ndsc_members_authed", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
