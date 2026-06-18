import "server-only";

type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
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

type SendVerificationEmailInput = {
  to: string;
  verifyUrl: string;
};

export function verificationEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getFromEmail());
}

export async function sendVerificationEmail({ to, verifyUrl }: SendVerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromEmail();

  if (!apiKey || !from) {
    throw new Error("Verification email is not configured.");
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
      subject: "Verify your NDSC members email",
      text: [
        "Welcome to the NDSC members area!",
        "",
        "Please verify your email address by clicking the link below:",
        verifyUrl,
        "",
        "This link expires in 24 hours. If you did not register, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0B1324">
          <h1 style="font-size:22px;margin:0 0 12px">Welcome to NDSC Members!</h1>
          <p>Please verify your email address to complete your registration.</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
              Verify email address
            </a>
          </p>
          <p style="color:#475569;font-size:14px">This link expires in 24 hours. If you did not register, you can ignore this email.</p>
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
