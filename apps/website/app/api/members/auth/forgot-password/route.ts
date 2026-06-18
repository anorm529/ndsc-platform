import { NextResponse } from "next/server";
import { createPasswordReset } from "@/lib/auth";
import {
  logEmailEvent,
  passwordResetEmailConfigured,
  sanitizeEmailError,
  sendPasswordResetEmail,
} from "@/lib/email";

function resetUrlBase(req: Request) {
  const directResetUrl = process.env.PASSWORD_RESET_URL?.trim();
  if (directResetUrl) return directResetUrl.replace(/\?token=$/, "").replace(/\/$/, "");

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return `${fromEnv.replace(/\/$/, "")}/members/reset-password`;

  return `${new URL(req.url).origin}/members/reset-password`;
}

export async function POST(req: Request) {
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
