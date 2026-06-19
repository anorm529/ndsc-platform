import { NextResponse } from "next/server";
import { checkRateLimit, createVerificationToken, logEmailEvent } from "@ndsc/auth";
import { getUserByEmail } from "@ndsc/auth";
import { sendVerificationEmail, sanitizeEmailError, verificationEmailConfigured } from "@/lib/email";

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
  const limit = await checkRateLimit(`resend-verification:${ip}`, 3, 60 * 15);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  // Always return success to avoid leaking whether an account exists
  const user = await getUserByEmail(email);
  if (!user || user.accountStatus !== "pending" || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  try {
    const token = await createVerificationToken(user.id);
    const verifyUrl = `${verifyUrlBase(req)}?token=${encodeURIComponent(token)}`;

    if (verificationEmailConfigured()) {
      const result = await sendVerificationEmail({ to: email, verifyUrl });
      await logEmailEvent({
        userId: user.id,
        email,
        type: "email_verification",
        providerMessageId: result.providerMessageId ?? undefined,
        status: "sent",
      });
    }
  } catch (error) {
    await logEmailEvent({
      userId: user.id,
      email,
      type: "email_verification",
      status: "failed",
      errorMessage: sanitizeEmailError(error) ?? undefined,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
