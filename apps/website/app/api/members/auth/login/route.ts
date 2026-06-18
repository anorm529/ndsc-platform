import { NextResponse } from "next/server";
import { checkRateLimit } from "@ndsc/auth";
import { authenticateUser, createUserSession } from "@/lib/auth";

function getIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const limit = await checkRateLimit(`login:${ip}`, 10, 60 * 15);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  const auth = await authenticateUser(email, password);
  if (!auth.ok) {
    const message =
      auth.reason === "pending"
        ? "Your account is awaiting approval."
        : auth.reason === "disabled"
          ? "This account has been disabled."
          : "Email or password is incorrect.";
    const status = auth.reason === "invalid" ? 401 : 403;
    return NextResponse.json({ ok: false, error: message, reason: auth.reason }, { status });
  }

  await createUserSession(auth.userId);
  return NextResponse.json({ ok: true });
}
