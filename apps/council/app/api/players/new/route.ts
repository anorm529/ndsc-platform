import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { createPlayer, enrollPlayers } from "@/lib/season-queries";
import { mainQuery } from "@/lib/main-db";
import {
  createUser,
  getUserByEmail,
  emailExists,
  hashPassword,
  linkUserToPlayer,
  logEmailEvent,
} from "@ndsc/auth";
import { sendCouncilEmail } from "@/lib/email";

const INVITE_TTL_DAYS = 7;

async function createInviteToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Invalidate any prior unused tokens
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

async function sendInviteEmail(
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

export async function POST(req: NextRequest) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    mode: "existing" | "new";
    // existing mode
    playerId?: string;
    // new mode
    displayName?: string;
    gender?: string;
    email?: string;
    sendInvite?: boolean;
    // shared
    seasonId?: string;
  };

  if (!body.seasonId) {
    return NextResponse.json({ error: "seasonId required" }, { status: 400 });
  }

  let playerId: string;

  if (body.mode === "existing") {
    // Enroll an existing player (selected from unenrolled list)
    if (!body.playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });
    playerId = body.playerId;

  } else {
    // Create a brand new player
    if (!body.displayName?.trim()) {
      return NextResponse.json({ error: "displayName required" }, { status: 400 });
    }
    playerId = await createPlayer(body.displayName.trim(), body.gender);

    // Optionally create a platform account and send invite
    if (body.email?.trim() && body.sendInvite) {
      const email = body.email.trim().toLowerCase();
      const alreadyExists = await emailExists(email);

      if (!alreadyExists) {
        // Placeholder password hash (user will set their own via invite link)
        const placeholderHash = await hashPassword(randomBytes(32).toString("base64url"));
        const newUser = await createUser({
          email,
          passwordHash: placeholderHash,
          role: "player",
          accountStatus: "pending",
          playerId,
          registrationName: body.displayName.trim(),
        });

        const token = await createInviteToken(newUser.id);

        // Get the inviting user's name for the email
        const inviterResult = await mainQuery<{ registration_name: string | null; email: string }>(
          `SELECT registration_name, email FROM users WHERE id = $1`,
          [user.id]
        );
        const inviterName = inviterResult.rows[0]?.registration_name
          ?? inviterResult.rows[0]?.email?.split("@")[0]
          ?? "NDSC Council";

        try {
          await sendInviteEmail(email, body.displayName.trim(), token, inviterName);
          await logEmailEvent({
            userId: newUser.id,
            email,
            type: "player_invite",
            status: "sent",
          });
        } catch (err) {
          // Don't fail the whole request if email fails — player is still created
          await logEmailEvent({
            userId: newUser.id,
            email,
            type: "player_invite",
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Unknown error",
          });
        }
      } else {
        // Email already exists — link the existing user to this new player
        const existingUser = await getUserByEmail(email);
        if (existingUser && !existingUser.playerId) {
          await linkUserToPlayer(existingUser.id, playerId);
        }
      }
    } else if (body.email?.trim() && !body.sendInvite) {
      // Email provided but no invite — just create the account without sending email
      const email = body.email.trim().toLowerCase();
      const alreadyExists = await emailExists(email);
      if (!alreadyExists) {
        const placeholderHash = await hashPassword(randomBytes(32).toString("base64url"));
        await createUser({
          email,
          passwordHash: placeholderHash,
          role: "player",
          accountStatus: "pending",
          playerId,
          registrationName: body.displayName?.trim(),
        });
      } else {
        const existingUser = await getUserByEmail(email);
        if (existingUser && !existingUser.playerId) {
          await linkUserToPlayer(existingUser.id, playerId);
        }
      }
    }
  }

  await enrollPlayers([playerId], body.seasonId, user.id);
  return NextResponse.json({ ok: true, playerId });
}
