import { randomBytes, createHash } from 'crypto'
import { getAuthDb } from './db'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createVerificationToken(userId: string): Promise<string> {
  const db = getAuthDb()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await db.query(
    'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  )

  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  )
  return rawToken
}

/** Marks the token used and returns the userId on success, null if invalid/expired. */
export async function consumeVerificationToken(rawToken: string): Promise<string | null> {
  const db = getAuthDb()
  const tokenHash = hashToken(rawToken)

  const result = await db.query<{ user_id: string }>(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash]
  )
  return result.rows[0]?.user_id ?? null
}
