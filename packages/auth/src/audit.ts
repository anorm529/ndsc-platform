import { getAuthDb } from './db'
import type { AuditData } from './types'

export async function logAuditAction(data: AuditData): Promise<void> {
  const db = getAuthDb()
  await db
    .query(
      `INSERT INTO admin_audit_log
       (actor_user_id, target_user_id, target_player_id, action, field_name, previous_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.actorUserId ?? null,
        data.targetUserId ?? null,
        data.targetPlayerId ?? null,
        data.action,
        data.fieldName ?? null,
        data.previousValue !== undefined ? JSON.stringify(data.previousValue) : null,
        data.newValue !== undefined ? JSON.stringify(data.newValue) : null,
      ]
    )
    .catch((err) => {
      console.error('[audit] Failed to write audit log entry:', err)
    })
}

export async function getAuditLog(filters?: {
  actorUserId?: string
  targetUserId?: string
  limit?: number
}) {
  const db = getAuthDb()
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (filters?.actorUserId) {
    conditions.push(`actor_user_id = $${idx++}`)
    params.push(filters.actorUserId)
  }
  if (filters?.targetUserId) {
    conditions.push(`target_user_id = $${idx++}`)
    params.push(filters.targetUserId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(filters?.limit ?? 50)

  const result = await db.query(
    `SELECT * FROM admin_audit_log ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    params
  )
  return result.rows
}
