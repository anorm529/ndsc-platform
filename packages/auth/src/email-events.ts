import { getAuthDb } from './db'
import type { EmailEventData } from './types'

export async function logEmailEvent(data: EmailEventData): Promise<void> {
  const db = getAuthDb()
  await db
    .query(
      `INSERT INTO email_events (user_id, email, type, provider, provider_message_id, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId ?? null,
        data.email,
        data.type,
        data.provider ?? 'resend',
        data.providerMessageId ?? null,
        data.status,
        data.errorMessage ?? null,
      ]
    )
    .catch((err) => {
      console.error('[email-events] Failed to write email event:', err)
    })
}

export async function getEmailEvents(filters?: {
  userId?: string
  type?: string
  status?: string
  limit?: number
}) {
  const db = getAuthDb()
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (filters?.userId) {
    conditions.push(`user_id = $${idx++}`)
    params.push(filters.userId)
  }
  if (filters?.type) {
    conditions.push(`type = $${idx++}`)
    params.push(filters.type)
  }
  if (filters?.status) {
    conditions.push(`status = $${idx++}`)
    params.push(filters.status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(filters?.limit ?? 100)

  const result = await db.query(
    `SELECT * FROM email_events ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    params
  )
  return result.rows
}
