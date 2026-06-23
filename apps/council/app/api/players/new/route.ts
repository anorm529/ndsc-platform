import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { createPlayer, enrollPlayers } from "@/lib/season-queries";
import { mainQuery } from "@/lib/main-db";
import { createInviteToken, sendInviteEmail } from "@/lib/invite";
import {
  createUser,
  getUserByEmail,
  emailExists,
  hashPassword,
  linkUserToPlayer,
  logEmailEvent,
} from "@ndsc/auth";

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
