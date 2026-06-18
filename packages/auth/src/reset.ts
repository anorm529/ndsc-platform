import { randomBytes, createHash } from 'crypto'
import { getAuthDb } from './db'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const db = getAuthDb()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  // Invalidate any existing unused tokens for this user
  await db.query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  )

  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  )
  return rawToken
}

/** Validates the token and marks it used. Returns the userId on success, null if invalid/expired. */
export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const db = getAuthDb()
  const tokenHash = hashToken(rawToken)

  const result = await db.query<{ user_id: string }>(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash]
  )
  return result.rows[0]?.user_id ?? null
}

export async function cleanExpiredResetTokens(): Promise<number> {
  const db = getAuthDb()
  const result = await db.query(
    'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL'
  )
  return result.rowCount ?? 0
}
