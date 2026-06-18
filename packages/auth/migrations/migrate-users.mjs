/**
 * One-time migration: copies users, sessions, and password reset tokens
 * from the main NDSC database into the new auth database.
 *
 * Run once:
 *   node packages/auth/migrations/migrate-users.mjs
 *
 * Requires both connection strings to be set in your environment.
 * You can run it like this from the monorepo root:
 *
 *   MAIN_DATABASE_URL="postgresql://..." AUTH_DATABASE_URL="postgresql://..." \
 *     node packages/auth/migrations/migrate-users.mjs
 */

import pg from 'pg'

const { Pool } = pg

const MAIN_DATABASE_URL = process.env.MAIN_DATABASE_URL
const AUTH_DATABASE_URL = process.env.AUTH_DATABASE_URL

if (!MAIN_DATABASE_URL) {
  console.error('❌  MAIN_DATABASE_URL is not set')
  process.exit(1)
}
if (!AUTH_DATABASE_URL) {
  console.error('❌  AUTH_DATABASE_URL is not set')
  process.exit(1)
}

const mainDb = new Pool({ connectionString: MAIN_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const authDb = new Pool({ connectionString: AUTH_DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function run() {
  console.log('🔗  Connecting to databases...')

  // ── 1. Migrate users ────────────────────────────────────────────────────────
  console.log('\n📋  Reading users from main DB...')
  const { rows: users } = await mainDb.query(`
    SELECT
      id::text,
      email,
      password_hash,
      role::text,
      player_id::text,
      email_verified,
      account_status::text,
      last_login,
      created_at,
      updated_at
    FROM public.users
    ORDER BY created_at
  `)
  console.log(`   Found ${users.length} users`)

  let insertedUsers = 0
  let skippedUsers = 0
  for (const u of users) {
    try {
      await authDb.query(
        `INSERT INTO users
           (id, email, password_hash, role, player_id, email_verified, account_status, last_login, created_at, updated_at)
         VALUES ($1, $2, $3, $4::user_role, $5::uuid, $6, $7::user_account_status, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email, u.password_hash, u.role, u.player_id, u.email_verified, u.account_status, u.last_login, u.created_at, u.updated_at]
      )
      insertedUsers++
    } catch (err) {
      console.warn(`   ⚠️  Skipped user ${u.email}: ${err.message}`)
      skippedUsers++
    }
  }
  console.log(`   ✅  Inserted ${insertedUsers} users (${skippedUsers} skipped/already exist)`)

  // ── 2. Migrate active sessions ──────────────────────────────────────────────
  console.log('\n📋  Reading active sessions from main DB...')
  const { rows: sessions } = await mainDb.query(`
    SELECT
      id::text,
      user_id::text,
      session_token,
      expires_at,
      created_at,
      last_seen,
      device_name,
      ip_address::text
    FROM public.user_sessions
    WHERE expires_at > NOW()
    ORDER BY created_at
  `)
  console.log(`   Found ${sessions.length} active sessions`)

  let insertedSessions = 0
  for (const s of sessions) {
    try {
      await authDb.query(
        `INSERT INTO user_sessions
           (id, user_id, session_token, expires_at, created_at, last_seen, device_name, ip_address, app)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8::inet, 'website')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.user_id, s.session_token, s.expires_at, s.created_at, s.last_seen, s.device_name, s.ip_address]
      )
      insertedSessions++
    } catch (err) {
      // Session may reference a user not yet migrated — safe to skip
      console.warn(`   ⚠️  Skipped session ${s.id}: ${err.message}`)
    }
  }
  console.log(`   ✅  Inserted ${insertedSessions} sessions`)

  // ── 3. Migrate active password reset tokens ─────────────────────────────────
  console.log('\n📋  Reading password reset tokens from main DB...')
  const { rows: tokens } = await mainDb.query(`
    SELECT
      id::text,
      user_id::text,
      token_hash,
      expires_at,
      used_at,
      created_at
    FROM public.password_reset_tokens
    WHERE expires_at > NOW() AND used_at IS NULL
    ORDER BY created_at
  `)
  console.log(`   Found ${tokens.length} active reset tokens`)

  let insertedTokens = 0
  for (const t of tokens) {
    try {
      await authDb.query(
        `INSERT INTO password_reset_tokens
           (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES ($1, $2::uuid, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.user_id, t.token_hash, t.expires_at, t.used_at, t.created_at]
      )
      insertedTokens++
    } catch (err) {
      console.warn(`   ⚠️  Skipped token ${t.id}: ${err.message}`)
    }
  }
  console.log(`   ✅  Inserted ${insertedTokens} reset tokens`)

  // ── 4. Verification ─────────────────────────────────────────────────────────
  console.log('\n🔍  Verifying auth DB...')
  const { rows: [counts] } = await authDb.query(`
    SELECT
      (SELECT COUNT(*) FROM users)                                                         AS users,
      (SELECT COUNT(*) FROM users WHERE account_status = 'active')                        AS active_users,
      (SELECT COUNT(*) FROM users WHERE account_status = 'pending')                       AS pending_users,
      (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW())                       AS active_sessions,
      (SELECT COUNT(*) FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > NOW()) AS pending_resets
  `)
  console.log('\n   Auth DB now contains:')
  console.log(`   • ${counts.users} total users (${counts.active_users} active, ${counts.pending_users} pending)`)
  console.log(`   • ${counts.active_sessions} active sessions`)
  console.log(`   • ${counts.pending_resets} pending password reset tokens`)

  console.log('\n✅  Migration complete!\n')
}

run()
  .catch((err) => {
    console.error('\n❌  Migration failed:', err.message)
    process.exit(1)
  })
  .finally(() => {
    mainDb.end()
    authDb.end()
  })
