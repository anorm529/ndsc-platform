import { NextResponse } from "next/server";
import { logEmailEvent, checkRateLimit } from "@ndsc/auth";
import { createPasswordReset } from "@/lib/auth";
import {
  passwordResetEmailConfigured,
  sanitizeEmailError,
  sendPasswordResetEmail,
} from "@/lib/email";

function getIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function resetUrlBase(req: Request) {
  const directResetUrl = process.env.PASSWORD_RESET_URL?.trim();
  if (directResetUrl) return directResetUrl.replace(/\?token=$/, "").replace(/\/$/, "");

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return `${fromEnv.replace(/\/$/, "")}/members/reset-password`;

  return `${new URL(req.url).origin}/members/reset-password`;
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const limit = await checkRateLimit(`forgot:${ip}`, 5, 60 * 15);
  if (!limit.allowed) {
    return NextResponse.json({ ok: true, message: "If that email has an account, a reset link will be sent." });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const reset = email ? await createPasswordReset(email) : null;
  const resetUrl = reset
    ? `${resetUrlBase(req)}?token=${encodeURIComponent(reset.token)}`
    : null;

  if (email && resetUrl && passwordResetEmailConfigured()) {
    try {
      const result = await sendPasswordResetEmail({ to: email, resetUrl });
      await logEmailEvent({
        userId: reset?.userId ?? null,
        email: reset?.email ?? email,
        type: "password_reset",
        providerMessageId: result.providerMessageId,
        status: "sent",
      });
    } catch (error) {
      await logEmailEvent({
        userId: reset?.userId ?? null,
        email: reset?.email ?? email,
        type: "password_reset",
        status: "failed",
        errorMessage: sanitizeEmailError(error),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has an account, a reset link will be sent.",
    resetUrl:
      process.env.NODE_ENV === "development" && !passwordResetEmailConfigured()
        ? resetUrl
        : undefined,
  });
}
