import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { playerId } = await params;
  const body = await req.json() as { active?: boolean };
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) required" }, { status: 400 });
  }

  await mainQuery(`UPDATE players SET active = $1 WHERE id = $2`, [body.active, playerId]);
  await mainQuery(
    `INSERT INTO admin_audit_log (actor_user_id, target_player_id, action, new_value)
     VALUES ($1, $2::uuid, $3, to_jsonb($4::bool))`,
    [user.id, playerId, body.active ? "player.activate" : "player.deactivate", body.active]
  );

  return NextResponse.json({ ok: true });
}
