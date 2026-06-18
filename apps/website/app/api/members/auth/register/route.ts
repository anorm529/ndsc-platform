import { NextResponse } from "next/server";
import { checkRateLimit, createVerificationToken, logEmailEvent } from "@ndsc/auth";
import { registerUser } from "@/lib/auth";
import {
  sendVerificationEmail,
  sanitizeEmailError,
  verificationEmailConfigured,
} from "@/lib/email";

function getIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function verifyUrlBase(req: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return `${fromEnv.replace(/\/$/, "")}/api/members/auth/verify-email`;
  return `${new URL(req.url).origin}/api/members/auth/verify-email`;
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const limit = await checkRateLimit(`register:${ip}`, 5, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  let userId: string;
  try {
    userId = await registerUser({
      name: String(body.name ?? ""),
      email,
      password: String(body.password ?? ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  // Send verification email — best-effort, registration already succeeded
  let verifyUrl: string | null = null;
  try {
    const token = await createVerificationToken(userId);
    verifyUrl = `${verifyUrlBase(req)}?token=${encodeURIComponent(token)}`;

    if (verificationEmailConfigured()) {
      const result = await sendVerificationEmail({ to: email, verifyUrl });
      await logEmailEvent({
        userId,
        email,
        type: "email_verification",
        providerMessageId: result.providerMessageId ?? undefined,
        status: "sent",
      });
    }
  } catch (error) {
    await logEmailEvent({
      userId,
      email,
      type: "email_verification",
      status: "failed",
      errorMessage: sanitizeEmailError(error) ?? undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    // Expose the URL in development when Resend isn't configured so you can test without email
    verifyUrl: process.env.NODE_ENV === "development" && !verificationEmailConfigured() ? verifyUrl : undefined,
  });
}
