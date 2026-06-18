import { NextResponse } from "next/server";
import { checkRateLimit } from "@ndsc/auth";
import { registerUser } from "@/lib/auth";

function getIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const limit = await checkRateLimit(`register:${ip}`, 5, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

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
