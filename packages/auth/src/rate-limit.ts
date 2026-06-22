import { getAuthDb } from './db'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Fixed-window rate limiter backed by Postgres.
 * key     — e.g. "login:1.2.3.4" or "forgot:user@example.com"
 * limit   — max attempts in the window
 * windowS — window size in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowS: number
): Promise<RateLimitResult> {
  const db = getAuthDb()

  try {
    const result = await db.query<{
      attempts: number
      window_start: Date
    }>(
      `INSERT INTO auth_rate_limits (key, attempts, window_start)
       VALUES ($1, 1, NOW())
       ON CONFLICT (key) DO UPDATE SET
         attempts     = CASE
                          WHEN auth_rate_limits.window_start < NOW() - make_interval(secs => $2)
                          THEN 1
                          ELSE auth_rate_limits.attempts + 1
                        END,
         window_start = CASE
                          WHEN auth_rate_limits.window_start < NOW() - make_interval(secs => $2)
                          THEN NOW()
                          ELSE auth_rate_limits.window_start
                        END
       RETURNING attempts, window_start`,
      [key, windowS]
    )

    const row = result.rows[0]
    const resetAt = new Date(row.window_start.getTime() + windowS * 1000)

    return {
      allowed: row.attempts <= limit,
      remaining: Math.max(0, limit - row.attempts),
      resetAt,
    }
  } catch (err) {
    // Fail open if the table doesn't exist yet — run the auth_rate_limits migration to enable limiting
    const isMissingTable = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '42P01'
    if (!isMissingTable) console.error('[rate-limit] Unexpected error:', err)
    return { allowed: true, remaining: limit, resetAt: new Date(Date.now() + windowS * 1000) }
  }
}
