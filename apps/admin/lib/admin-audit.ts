import "server-only";

import { dbQuery } from "@/lib/db";

type AuditValue = string | number | boolean | null | Record<string, unknown>;

export type AdminAuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  fieldName: string | null;
  previousValue: AuditValue;
  newValue: AuditValue;
  createdAt: Date;
};

export async function logAdminAudit({
  actorUserId,
  targetUserId,
  targetPlayerId,
  action,
  fieldName,
  previousValue,
  newValue,
}: {
  actorUserId: string;
  targetUserId?: string | null;
  targetPlayerId?: string | null;
  action: string;
  fieldName?: string | null;
  previousValue?: AuditValue;
  newValue?: AuditValue;
}) {
  try {
    await dbQuery(
      `insert into admin_audit_log (
        actor_user_id,
        target_user_id,
        target_player_id,
        action,
        field_name,
        previous_value,
        new_value
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
      [
        actorUserId,
        targetUserId ?? null,
        targetPlayerId ?? null,
        action,
        fieldName ?? null,
        JSON.stringify(previousValue ?? null),
        JSON.stringify(newValue ?? null),
      ],
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "42P01"
    ) {
      return;
    }

    throw error;
  }
}

export async function getAuditLogForAccount(userId: string) {
  try {
    const result = await dbQuery<{
      id: string;
      actor_email: string | null;
      action: string;
      field_name: string | null;
      previous_value: AuditValue;
      new_value: AuditValue;
      created_at: Date;
    }>(
      `select
        a.id,
        actor.email as actor_email,
        a.action,
        a.field_name,
        a.previous_value,
        a.new_value,
        a.created_at
      from admin_audit_log a
      left join users actor on actor.id = a.actor_user_id
      where a.target_user_id = $1
      order by a.created_at desc
      limit 50`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      fieldName: row.field_name,
      previousValue: row.previous_value,
      newValue: row.new_value,
      createdAt: row.created_at,
    })) satisfies AdminAuditEntry[];
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "42P01"
    ) {
      return [];
    }

    throw error;
  }
}

export async function getGlobalAuditLog(limit = 100) {
  try {
    const result = await dbQuery<{
      id: string;
      actor_email: string | null;
      target_email: string | null;
      target_player_name: string | null;
      action: string;
      field_name: string | null;
      previous_value: AuditValue;
      new_value: AuditValue;
      created_at: Date;
    }>(
      `select
        a.id,
        actor.email as actor_email,
        target.email as target_email,
        p.display_name as target_player_name,
        a.action,
        a.field_name,
        a.previous_value,
        a.new_value,
        a.created_at
      from admin_audit_log a
      left join users actor on actor.id = a.actor_user_id
      left join users target on target.id = a.target_user_id
      left join players p on p.id = a.target_player_id
      order by a.created_at desc
      limit $1`,
      [limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      targetEmail: row.target_email,
      targetPlayerName: row.target_player_name,
      action: row.action,
      fieldName: row.field_name,
      previousValue: row.previous_value,
      newValue: row.new_value,
      createdAt: row.created_at,
    }));
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "42P01"
    ) {
      return [];
    }

    throw error;
  }
}
