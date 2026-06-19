export type UserRole = 'player' | 'admin' | 'owner'
export type AccountStatus = 'active' | 'pending' | 'disabled'

const USER_ROLES: readonly UserRole[] = ['player', 'admin', 'owner']
const ACCOUNT_STATUSES: readonly AccountStatus[] = ['active', 'pending', 'disabled']

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return ACCOUNT_STATUSES.includes(value as AccountStatus)
}

export interface User {
  id: string
  email: string
  passwordHash: string
  role: UserRole
  playerId: string | null
  registrationName: string | null
  emailVerified: boolean
  accountStatus: AccountStatus
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  sessionToken: string
  expiresAt: Date
  createdAt: Date
  lastSeen: Date
  deviceName: string | null
  ipAddress: string | null
  app: string
}

/** Lightweight user object returned from session validation — avoids a second DB lookup on every request */
export interface SessionUser {
  userId: string
  email: string
  role: UserRole
  accountStatus: AccountStatus
  playerId: string | null
  emailVerified: boolean
}

export interface CreateUserData {
  email: string
  passwordHash: string
  role?: UserRole
  accountStatus?: AccountStatus
  playerId?: string | null
  registrationName?: string | null
}

export interface UserFilters {
  status?: AccountStatus
  role?: UserRole
  search?: string
  linkedToPlayer?: boolean
}

export interface EmailEventData {
  userId?: string
  email: string
  type: string
  provider?: string
  providerMessageId?: string
  status: 'sent' | 'failed' | 'delivered' | 'bounced'
  errorMessage?: string
}

export interface AuditData {
  actorUserId?: string
  targetUserId?: string
  targetPlayerId?: string
  action: string
  fieldName?: string
  previousValue?: unknown
  newValue?: unknown
}
