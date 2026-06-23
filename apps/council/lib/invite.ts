import { randomBytes, createHash } from "crypto";
import { mainQuery } from "@/lib/main-db";
import { sendCouncilEmail } from "@/lib/email";

const INVITE_TTL_DAYS = 7;

export async function createInviteToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await mainQuery(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
  await mainQuery(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return rawToken;
}

export async function sendInviteEmail(
  email: string,
  displayName: string,
  token: string,
  invitedByName: string
): Promise<void> {
  const siteUrl = process.env.MEMBERS_SITE_URL ?? "https://northdownsoftballclub.co.uk";
  const link = `${siteUrl}/members/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
    <div style="margin-bottom:24px;">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#14b8a6;margin:0 0 8px;">
        North Down Softball Club
      </p>
      <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0;">
        Welcome to the members portal
      </h1>
    </div>

    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi ${displayName},
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      ${invitedByName} from the NDSC council has added you to the members portal.
      Click the button below to set up your password and access your account.
    </p>

    <a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
      Set up my account →
    </a>

    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 8px;">
      This link expires in ${INVITE_TTL_DAYS} days. If it expires, use the
      <a href="${siteUrl}/members/login" style="color:#14b8a6;">forgot password</a>
      link on the login page.
    </p>
    <p style="color:#cbd5e1;font-size:11px;margin:0;">
      If you weren't expecting this email, you can ignore it.
    </p>
  </div>
</body>
</html>`;

  const text = `Welcome to the NDSC members portal, ${displayName}!\n\n${invitedByName} has added you to the members portal. Set up your password here:\n\n${link}\n\nThis link expires in ${INVITE_TTL_DAYS} days.`;

  await sendCouncilEmail({ to: email, subject: "Welcome to NDSC — set up your account", html, text });
}

export async function sendVerificationEmail(
  email: string,
  displayName: string,
  token: string
): Promise<void> {
  const siteUrl = process.env.MEMBERS_SITE_URL ?? "https://northdownsoftballclub.co.uk";
  const link = `${siteUrl}/api/members/auth/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
    <div style="margin-bottom:24px;">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#14b8a6;margin:0 0 8px;">
        North Down Softball Club
      </p>
      <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0;">
        Verify your email address
      </h1>
    </div>

    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi ${displayName},
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Click the button below to verify your email address and complete your account setup.
      Your password is unchanged.
    </p>

    <a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
      Verify my email →
    </a>

    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 8px;">
      This link expires in 7 days.
    </p>
    <p style="color:#cbd5e1;font-size:11px;margin:0;">
      If you weren't expecting this email, you can ignore it.
    </p>
  </div>
</body>
</html>`;

  const text = `Hi ${displayName},\n\nVerify your email address here — your password is unchanged:\n\n${link}\n\nThis link expires in 7 days.`;

  await sendCouncilEmail({ to: email, subject: "Verify your NDSC email address", html, text });
}
