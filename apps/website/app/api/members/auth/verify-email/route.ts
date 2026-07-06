import { NextResponse } from "next/server";
import { consumePasswordResetToken, consumeVerificationToken, markEmailVerified } from "@ndsc/auth";

// No side effects on GET: email security scanners prefetch links and were
// burning single-use tokens before the user ever clicked. The emailed link
// lands on a confirmation page, and the button there POSTs the token.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(`${url.origin}/members?verified=invalid`);
  }

  return NextResponse.redirect(
    `${url.origin}/members/verify-email?token=${encodeURIComponent(token)}`,
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Registration and resend emails store tokens in email_verification_tokens;
  // council invites store theirs in password_reset_tokens. Accept both.
  const userId =
    (await consumeVerificationToken(token)) ?? (await consumePasswordResetToken(token));

  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await markEmailVerified(userId);
  return NextResponse.json({ ok: true });
}
