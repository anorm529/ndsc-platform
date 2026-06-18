import { randomBytes, createHash } from 'crypto'
import { getAuthDb } from './db'
import type { Session, SessionUser } from './types'

const SESSION_TTL_MS: Record<string, number> = {
  website: 30 * 24 * 60 * 60 * 1000,   // 30 days
  fantasy: 7 * 24 * 60 * 60 * 1000,    // 7 days
  admin: 12 * 60 * 60 * 1000,          // 12 hours
  tournament: 12 * 60 * 60 * 1000,     // 12 hours
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(
  userId: string,
  app: string,
  deviceName?: string,
  ipAddress?: string
): Promise<string> {
  const db = getAuthDb()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(rawToken)
  const ttl = SESSION_TTL_MS[app] ?? SESSION_TTL_MS.website
  const expiresAt = new Date(Date.now() + ttl)

  await db.query(
    `INSERT INTO user_sessions (user_id, session_token, expires_at, device_name, ip_address, app)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, tokenHash, expiresAt, deviceName ?? null, ipAddress ?? null, app]
  )
  return rawToken
}

export async function validateSession(rawToken: string): Promise<SessionUser | null> {
  const db = getAuthDb()
  const tokenHash = hashToken(rawToken)

  const result = await db.query<{
    user_id: string
    email: string
    role: string
    account_status: string
    player_id: string | null
    email_verified: boolean
  }>(
    `SELECT u.id AS user_id, u.email, u.role, u.account_status, u.player_id, u.email_verified
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_token = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  )

  if (!result.rows[0]) return null
  const row = result.rows[0]

  // Update last_seen without blocking the request
  db.query('UPDATE user_sessions SET last_seen = NOW() WHERE session_token = $1', [tokenHash])
    .catch(() => {})

  return {
    userId: row.user_id,
    email: row.email,
    role: row.role as SessionUser['role'],
    accountStatus: row.account_status as SessionUser['accountStatus'],
    playerId: row.player_id,
    emailVerified: row.email_verified,
  }
}

export async function deleteSession(rawToken: string): Promise<void> {
  const db = getAuthDb()
  await db.query('DELETE FROM user_sessions WHERE session_token = $1', [hashToken(rawToken)])
}

export async function deleteAllUserSessions(
  userId: string,
  exceptRawToken?: string
): Promise<void> {
  const db = getAuthDb()
  if (exceptRawToken) {
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND session_token != $2',
      [userId, hashToken(exceptRawToken)]
    )
  } else {
    await db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId])
  }
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const db = getAuthDb()
  const result = await db.query(
    `SELECT id, user_id, session_token, expires_at, created_at, last_seen, device_name, ip_address, app
     FROM user_sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY last_seen DESC`,
    [userId]
  )
  return result.rows as Session[]
}

export async function cleanExpiredSessions(): Promise<number> {
  const db = getAuthDb()
  const result = await db.query('DELETE FROM user_sessions WHERE expires_at < NOW()')
  return result.rowCount ?? 0
}

export function getSessionTtlMs(app: string): number {
  return SESSION_TTL_MS[app] ?? SESSION_TTL_MS.website
}
