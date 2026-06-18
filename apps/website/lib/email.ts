import "server-only";

import { dbQuery } from "@/lib/db";

type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

type EmailEventInput = {
  userId: string | null;
  email: string;
  type: "password_reset";
  providerMessageId?: string | null;
  status: "sent" | "failed" | "delivered" | "bounced";
  errorMessage?: string | null;
};

type ResendResponse = {
  id?: string;
};

function getFromEmail() {
  return process.env.PASSWORD_RESET_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
}

export function passwordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getFromEmail());
}

function safeEmailError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/token=[^\\s"'<>]+/gi, "token=[redacted]")
    .replace(/Bearer\\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .slice(0, 500);
}

export async function logEmailEvent({
  userId,
  email,
  type,
  providerMessageId = null,
  status,
  errorMessage = null,
}: EmailEventInput) {
  await dbQuery(
    `
      insert into public.email_events (
        user_id,
        email,
        type,
        provider,
        provider_message_id,
        status,
        error_message
      )
      values ($1::uuid, $2, $3, 'resend', $4, $5, $6)
    `,
    [userId, email, type, providerMessageId, status, errorMessage ? safeEmailError(errorMessage) : null]
  );
}

export async function sendPasswordResetEmail({ to, resetUrl }: SendPasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromEmail();

  if (!apiKey || !from) {
    throw new Error("Password reset email is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your NDSC members password",
      text: [
        "You requested a password reset for your NDSC members account.",
        "",
        "Use this link to choose a new password:",
        resetUrl,
        "",
        "This link expires in one hour. If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0B1324">
          <h1 style="font-size:22px;margin:0 0 12px">Reset your NDSC members password</h1>
          <p>You requested a password reset for your NDSC members account.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#5eead4;color:#0B1324;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
              Choose a new password
            </a>
          </p>
          <p style="color:#475569;font-size:14px">This link expires in one hour. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend email failed: ${response.status}${body ? ` ${body}` : ""}`);
  }

  const body = (await response.json().catch(() => ({}))) as ResendResponse;
  return {
    providerMessageId: body.id ?? null,
  };
}

export function sanitizeEmailError(error: unknown) {
  return safeEmailError(error);
}
