import { getAuthDb } from './db'

// ─── Canonical permission definitions ─────────────────────────────────────────

export const ADMIN_PERMISSIONS = [
  'overview',
  'approvals',
  'accounts',
  'flags',
  'audit',
  'email',
  'cleanup',
  'database',
  'barracudas',
  'documents',
] as const

export const TOURNAMENT_PERMISSIONS = [
  'tournaments',
  'schedule',
  'scores',
  'check_in',
] as const

export const FANTASY_PERMISSIONS = [
  'leagues',
  'scoring',
  'pricing',
  'join_requests',
  'awards',
  'settings',
] as const

export const COUNCIL_PERMISSIONS = [
  'chairman',
  'vice_chair',
  'treasurer',
  'captain',
  'secretary',
  'social_media',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]
export type TournamentPermission = (typeof TOURNAMENT_PERMISSIONS)[number]
export type FantasyPermission = (typeof FANTASY_PERMISSIONS)[number]
export type CouncilPermission = (typeof COUNCIL_PERMISSIONS)[number]
export type AppPermission = AdminPermission | TournamentPermission | FantasyPermission | CouncilPermission

export type App = 'admin' | 'tournament' | 'fantasy' | 'council'

export const PERMISSION_LABELS: Record<App, Record<string, string>> = {
  admin: {
    overview:   'System overview',
    approvals:  'Account approvals',
    accounts:   'Account management',
    flags:      'Flag management',
    audit:      'Audit log',
    email:      'Email monitoring',
    cleanup:    'Database cleanup',
    database:   'Database management',
    barracudas: 'Barracudas roster',
    documents:  'Club documents',
  },
  tournament: {
    tournaments: 'Tournament management',
    schedule:    'Schedule & templates',
    scores:      'Score entry',
    check_in:    'Check-in',
  },
  fantasy: {
    leagues:       'League management',
    scoring:       'Game scoring',
    pricing:       'Player pricing',
    join_requests: 'Join requests',
    awards:        'Awards',
    settings:      'League settings',
  },
  council: {
    chairman:    'Chairman — full council access',
    vice_chair:  'Vice Chair — full council access',
    treasurer:   'Treasurer — accounts & fees',
    captain:     'Captain — team roster & fee status',
    secretary:   'Secretary — meetings & minutes',
    social_media: 'Social Media Officer — members & meetings (no treasurer)',
  },
}

export const ALL_PERMISSIONS: Record<App, readonly string[]> = {
  admin:      ADMIN_PERMISSIONS,
  tournament: TOURNAMENT_PERMISSIONS,
  fantasy:    FANTASY_PERMISSIONS,
  council:    COUNCIL_PERMISSIONS,
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export interface AppPermissionRow {
  userId: string
  app: string
  permission: string
  grantedAt: Date
  grantedBy: string | null
}

/** All permissions a user has for a specific app. */
export async function getUserAppPermissions(userId: string, app: string): Promise<Set<string>> {
  const db = getAuthDb()
  const result = await db.query<{ permission: string }>(
    'SELECT permission FROM app_permissions WHERE user_id = $1 AND app = $2',
    [userId, app]
  )
  return new Set(result.rows.map((r) => r.permission))
}

/** All permissions a user has across all apps, grouped by app. */
export async function getAllUserPermissions(userId: string): Promise<Record<string, string[]>> {
  const db = getAuthDb()
  const result = await db.query<{ app: string; permission: string }>(
    'SELECT app, permission FROM app_permissions WHERE user_id = $1 ORDER BY app, permission',
    [userId]
  )
  const out: Record<string, string[]> = {}
  for (const row of result.rows) {
    ;(out[row.app] ??= []).push(row.permission)
  }
  return out
}

/** Every permission grant for a given app (for the management UI). */
export async function getAppPermissionGrants(app: string): Promise<AppPermissionRow[]> {
  const db = getAuthDb()
  const result = await db.query<{
    user_id: string
    app: string
    permission: string
    granted_at: Date
    granted_by: string | null
  }>(
    'SELECT user_id, app, permission, granted_at, granted_by FROM app_permissions WHERE app = $1',
    [app]
  )
  return result.rows.map((r) => ({
    userId: r.user_id,
    app: r.app,
    permission: r.permission,
    grantedAt: r.granted_at,
    grantedBy: r.granted_by,
  }))
}

export async function grantAppPermission(
  userId: string,
  app: string,
  permission: string,
  grantedBy?: string
): Promise<void> {
  const db = getAuthDb()
  await db.query(
    `INSERT INTO app_permissions (user_id, app, permission, granted_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, app, permission) DO NOTHING`,
    [userId, app, permission, grantedBy ?? null]
  )
}

export async function revokeAppPermission(
  userId: string,
  app: string,
  permission: string
): Promise<void> {
  const db = getAuthDb()
  await db.query(
    'DELETE FROM app_permissions WHERE user_id = $1 AND app = $2 AND permission = $3',
    [userId, app, permission]
  )
}

/**
 * Replace all permissions a user has for an app in one operation.
 * Permissions in the new set are inserted; any not in the set are removed.
 */
export async function setUserAppPermissions(
  userId: string,
  app: string,
  permissions: string[],
  grantedBy?: string
): Promise<void> {
  const db = getAuthDb()
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM app_permissions WHERE user_id = $1 AND app = $2', [userId, app])
    for (const permission of permissions) {
      await client.query(
        `INSERT INTO app_permissions (user_id, app, permission, granted_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, app, permission, grantedBy ?? null]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Check whether a user has a specific permission for an app. */
export async function hasAppPermission(
  userId: string,
  app: string,
  permission: string
): Promise<boolean> {
  const perms = await getUserAppPermissions(userId, app)
  return perms.has(permission)
}

/** Whether a user has at least one permission for an app. */
export async function hasAnyAppPermission(userId: string, app: string): Promise<boolean> {
  const db = getAuthDb()
  const result = await db.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM app_permissions WHERE user_id = $1 AND app = $2) AS exists',
    [userId, app]
  )
  return result.rows[0]?.exists ?? false
}
