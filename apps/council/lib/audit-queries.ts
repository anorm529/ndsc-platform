import { mainQuery } from "@/lib/main-db";

export interface RosterTransfer {
  id: string;
  transferredAt: Date;
  playerName: string;
  fromTeam: string | null;
  toTeam: string | null;
  actorName: string | null;
  notes: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  fieldName: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
  targetName: string | null;
  targetEmail: string | null;
  targetPlayerId: string | null;
}

export async function getRosterTransfersForSeason(
  seasonId: string,
  teamIds?: string[]
): Promise<RosterTransfer[]> {
  const hasTeamFilter = teamIds && teamIds.length > 0;

  const res = await mainQuery<{
    id: string;
    transferred_at: Date;
    player_name: string;
    from_team: string | null;
    to_team: string | null;
    actor_name: string | null;
    notes: string | null;
  }>(
    `SELECT
       srt.id::text,
       srt.transferred_at,
       p.display_name AS player_name,
       ft.name       AS from_team,
       tt.name       AS to_team,
       coalesce(u.registration_name, u.email) AS actor_name,
       srt.notes
     FROM season_roster_transfers srt
     JOIN   players p  ON p.id  = srt.player_id
     LEFT JOIN teams ft ON ft.id = srt.from_team_id
     LEFT JOIN teams tt ON tt.id = srt.to_team_id
     LEFT JOIN users u  ON u.id  = srt.transferred_by
     WHERE srt.season_id = $1
     ${hasTeamFilter ? "AND (srt.from_team_id = ANY($2) OR srt.to_team_id = ANY($2))" : ""}
     ORDER BY srt.transferred_at DESC
     LIMIT 100`,
    hasTeamFilter ? [seasonId, teamIds] : [seasonId]
  );

  return res.rows.map((r) => ({
    id: r.id,
    transferredAt: r.transferred_at,
    playerName: r.player_name,
    fromTeam: r.from_team,
    toTeam: r.to_team,
    actorName: r.actor_name,
    notes: r.notes,
  }));
}

export async function getAdminAuditLog(limit = 200): Promise<AuditEntry[]> {
  const res = await mainQuery<{
    id: string;
    action: string;
    field_name: string | null;
    previous_value: unknown;
    new_value: unknown;
    created_at: Date;
    actor_name: string | null;
    actor_email: string | null;
    target_name: string | null;
    target_email: string | null;
    target_player_id: string | null;
  }>(
    `SELECT
       aal.id::text,
       aal.action,
       aal.field_name,
       aal.previous_value,
       aal.new_value,
       aal.created_at,
       coalesce(actor.registration_name, actor.email) AS actor_name,
       actor.email AS actor_email,
       coalesce(tgt.registration_name, tgt.email)     AS target_name,
       tgt.email AS target_email,
       aal.target_player_id::text
     FROM admin_audit_log aal
     LEFT JOIN users actor ON actor.id = aal.actor_user_id
     LEFT JOIN users tgt   ON tgt.id   = aal.target_user_id
     ORDER BY aal.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return res.rows.map((r) => ({
    id: r.id,
    action: r.action,
    fieldName: r.field_name,
    previousValue: r.previous_value,
    newValue: r.new_value,
    createdAt: r.created_at,
    actorName: r.actor_name,
    actorEmail: r.actor_email,
    targetName: r.target_name,
    targetEmail: r.target_email,
    targetPlayerId: r.target_player_id,
  }));
}
