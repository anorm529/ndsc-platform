import { getAuthDb } from './db'
import type { User, CreateUserData, UserRole, AccountStatus, UserFilters } from './types'

function mapRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    role: row.role as UserRole,
    playerId: (row.player_id as string | null) ?? null,
    emailVerified: row.email_verified as boolean,
    accountStatus: row.account_status as AccountStatus,
    lastLogin: row.last_login ? new Date(row.last_login as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getAuthDb()
  const result = await db.query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getAuthDb()
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return []
  const db = getAuthDb()
  const result = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids])
  return result.rows.map(mapRow)
}

export async function getUserByPlayerId(playerId: string): Promise<User | null> {
  const db = getAuthDb()
  const result = await db.query('SELECT * FROM users WHERE player_id = $1', [playerId])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function createUser(data: CreateUserData): Promise<User> {
  const db = getAuthDb()
  const result = await db.query(
    `INSERT INTO users (email, password_hash, role, account_status, player_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.email.toLowerCase().trim(),
      data.passwordHash,
      data.role ?? 'player',
      data.accountStatus ?? 'pending',
      data.playerId ?? null,
    ]
  )
  return mapRow(result.rows[0])
}

export async function updateLastLogin(userId: string): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [userId])
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    userId,
  ])
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId])
}

export async function updateUserStatus(userId: string, status: AccountStatus): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2', [
    status,
    userId,
  ])
}

export async function linkUserToPlayer(userId: string, playerId: string): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET player_id = $1, updated_at = NOW() WHERE id = $2', [
    playerId,
    userId,
  ])
}

export async function unlinkUserFromPlayer(userId: string): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET player_id = NULL, updated_at = NOW() WHERE id = $1', [userId])
}

export async function markEmailVerified(userId: string): Promise<void> {
  const db = getAuthDb()
  await db.query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [
    userId,
  ])
}

export async function getAllUsers(filters?: UserFilters): Promise<User[]> {
  const db = getAuthDb()
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (filters?.status) {
    conditions.push(`account_status = $${idx++}`)
    params.push(filters.status)
  }
  if (filters?.role) {
    conditions.push(`role = $${idx++}`)
    params.push(filters.role)
  }
  if (filters?.search) {
    conditions.push(`email ILIKE $${idx++}`)
    params.push(`%${filters.search}%`)
  }
  if (filters?.linkedToPlayer === true) {
    conditions.push('player_id IS NOT NULL')
  } else if (filters?.linkedToPlayer === false) {
    conditions.push('player_id IS NULL')
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await db.query(
    `SELECT * FROM users ${where} ORDER BY created_at DESC`,
    params
  )
  return result.rows.map(mapRow)
}

export async function getPendingUsers(): Promise<User[]> {
  return getAllUsers({ status: 'pending' })
}

export async function emailExists(email: string): Promise<boolean> {
  const db = getAuthDb()
  const result = await db.query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ])
  return result.rows.length > 0
}
