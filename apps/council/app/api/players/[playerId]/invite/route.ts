import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";
import { createInviteToken, sendInviteEmail } from "@/lib/invite";
import { logEmailEvent } from "@ndsc/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerId } = await params;

  // Fetch the player's linked user account
  const res = await mainQuery<{
    user_id: string;
    email: string;
    registration_name: string | null;
    account_status: string;
  }>(
    `SELECT u.id AS user_id, u.email, u.registration_name, u.account_status
     FROM players p
     JOIN users u ON u.player_id = p.id
     WHERE p.id = $1
     LIMIT 1`,
    [playerId]
  );

  const account = res.rows[0];
  if (!account) {
    return NextResponse.json({ error: "No user account linked to this player" }, { status: 404 });
  }

  const actorRes = await mainQuery<{ registration_name: string | null; email: string }>(
    `SELECT registration_name, email FROM users WHERE id = $1`,
    [user.id]
  );
  const actorName = actorRes.rows[0]?.registration_name
    ?? actorRes.rows[0]?.email?.split("@")[0]
    ?? "NDSC Council";

  const displayName = account.registration_name ?? account.email.split("@")[0];
  const token = await createInviteToken(account.user_id);

  try {
    await sendInviteEmail(account.email, displayName, token, actorName);
    await logEmailEvent({
      userId: account.user_id,
      email: account.email,
      type: "player_invite",
      status: "sent",
    });
  } catch (err) {
    await logEmailEvent({
      userId: account.user_id,
      email: account.email,
      type: "player_invite",
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json({ error: "Email failed to send" }, { status: 500 });
  }

  await mainQuery(
    `INSERT INTO admin_audit_log (actor_user_id, target_player_id, action, new_value)
     VALUES ($1, $2::uuid, 'player.invite', to_jsonb($3::text))`,
    [user.id, playerId, account.email]
  );

  return NextResponse.json({ ok: true });
}
