// Types and guards
export type {
  User,
  Session,
  SessionUser,
  CreateUserData,
  UserFilters,
  UserRole,
  AccountStatus,
  EmailEventData,
  AuditData,
} from './types'
export { isUserRole, isAccountStatus } from './types'

// Database connection (for apps that need direct access)
export { getAuthDb } from './db'

// Password hashing and verification
export { hashPassword, verifyPassword } from './password'

// User management
export {
  getUserByEmail,
  getUserById,
  getUsersByIds,
  getUserByPlayerId,
  createUser,
  updateLastLogin,
  updateUserPassword,
  updateUserRole,
  updateUserStatus,
  linkUserToPlayer,
  unlinkUserFromPlayer,
  markEmailVerified,
  getAllUsers,
  getPendingUsers,
  emailExists,
} from './user'

// Session management
export {
  createSession,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  getUserSessions,
  cleanExpiredSessions,
  getSessionTtlMs,
} from './session'

// Password reset
export { createPasswordResetToken, consumePasswordResetToken, cleanExpiredResetTokens } from './reset'

// Email event logging
export { logEmailEvent, getEmailEvents } from './email-events'

// Admin audit log
export { logAuditAction, getAuditLog } from './audit'

// Rate limiting
export { checkRateLimit } from './rate-limit'
export type { RateLimitResult } from './rate-limit'
