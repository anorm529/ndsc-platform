import { NextRequest, NextResponse } from "next/server";
import { getCouncilUser, hasRosterManagementAccess } from "@/lib/council-session";
import { mainQuery } from "@/lib/main-db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as Record<string, number | null>;

  const existing = await mainQuery<{
    player_id: string; game_id: string;
    innings: number | null; singles: number; doubles: number; triples: number;
    home_runs: number; rbis: number; runs: number; walks: number;
    batter_outs: number; at_bats: number; unassisted_outs: number; assisted_outs: number;
  }>(
    `SELECT player_id::text, game_id::text, innings, singles, doubles, triples,
            home_runs, rbis, runs, walks, batter_outs, at_bats, unassisted_outs, assisted_outs
     FROM player_game_stats WHERE id = $1`,
    [id]
  );

  if (!existing.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prev = existing.rows[0];

  // Map incoming camelCase body to DB snake_case for diffing
  const incoming: Record<string, number | null> = {
    innings:        body.innings ?? null,
    singles:        body.singles ?? 0,
    doubles:        body.doubles ?? 0,
    triples:        body.triples ?? 0,
    home_runs:      body.homeRuns ?? 0,
    rbis:           body.rbis ?? 0,
    runs:           body.runs ?? 0,
    walks:          body.walks ?? 0,
    batter_outs:    body.batterOuts ?? 0,
    at_bats:        body.atBats ?? 0,
    unassisted_outs: body.unassistedOuts ?? 0,
    assisted_outs:  body.assistedOuts ?? 0,
  };

  // Only store fields that actually changed
  const changedFrom: Record<string, number | null> = {};
  const changedTo:   Record<string, number | null> = {};
  for (const key of Object.keys(incoming) as (keyof typeof incoming)[]) {
    const oldVal = (prev as unknown as Record<string, number | null>)[key] ?? null;
    const newVal = incoming[key];
    if (oldVal !== newVal) {
      changedFrom[key] = oldVal;
      changedTo[key]   = newVal;
    }
  }

  await mainQuery(
    `UPDATE player_game_stats SET
       innings = $2, singles = $3, doubles = $4, triples = $5,
       home_runs = $6, rbis = $7, runs = $8, walks = $9,
       batter_outs = $10, at_bats = $11, unassisted_outs = $12, assisted_outs = $13
     WHERE id = $1`,
    [id, incoming.innings, incoming.singles, incoming.doubles, incoming.triples,
         incoming.home_runs, incoming.rbis, incoming.runs, incoming.walks,
         incoming.batter_outs, incoming.at_bats, incoming.unassisted_outs, incoming.assisted_outs]
  );

  if (Object.keys(changedFrom).length > 0) {
    await mainQuery(
      `INSERT INTO admin_audit_log (actor_user_id, target_player_id, action, previous_value, new_value)
       VALUES ($1, $2::uuid, 'stats.record.update', $3::jsonb, $4::jsonb)`,
      [user.id, prev.player_id, JSON.stringify(changedFrom), JSON.stringify(changedTo)]
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCouncilUser();
  if (!user || !hasRosterManagementAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await mainQuery<{ player_id: string; game_id: string }>(
    `SELECT player_id::text, game_id::text FROM player_game_stats WHERE id = $1`,
    [id]
  );
  if (!existing.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { player_id } = existing.rows[0];

  await mainQuery(`DELETE FROM player_game_stats WHERE id = $1`, [id]);

  await mainQuery(
    `INSERT INTO admin_audit_log (actor_user_id, target_player_id, action, new_value)
     VALUES ($1, $2::uuid, 'stats.record.delete', to_jsonb($3::text))`,
    [user.id, player_id, id]
  );

  return NextResponse.json({ ok: true });
}
