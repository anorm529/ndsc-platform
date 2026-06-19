import {
  validateSession,
  getUserAppPermissions,
  hasAnyAppPermission,
  FANTASY_PERMISSIONS,
  PERMISSION_LABELS,
  type FantasyPermission,
} from "@ndsc/auth";
import { getCurrentSessionToken } from "./auth";

export { FANTASY_PERMISSIONS, type FantasyPermission };

export const fantasyPermissionLabels = PERMISSION_LABELS.fantasy as Record<FantasyPermission, string>;

/** Resolve the current user's session user (role + id) without a second DB hit if already cached. */
async function getSessionUser() {
  const token = await getCurrentSessionToken();
  if (!token) return null;
  return validateSession(token);
}

export async function getFantasyUserPermissions(userId: string): Promise<Set<FantasyPermission>> {
  const perms = await getUserAppPermissions(userId, "fantasy");
  return perms as Set<FantasyPermission>;
}

/** Returns true for owners/admins (global bypass) or users with the specific fantasy permission. */
export async function hasFantasyPermission(permission: FantasyPermission): Promise<boolean> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.accountStatus !== "active") return false;
  if (sessionUser.role === "owner" || sessionUser.role === "admin") return true;
  const perms = await getFantasyUserPermissions(sessionUser.userId);
  return perms.has(permission);
}

/** Throws if the current user lacks the permission. */
export async function requireFantasyPermission(permission: FantasyPermission): Promise<void> {
  if (!(await hasFantasyPermission(permission))) {
    throw new Error("You don't have permission to access this section.");
  }
}

/** Whether the current user can access any fantasy admin section. */
export async function canAccessFantasyAdmin(): Promise<boolean> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.accountStatus !== "active") return false;
  if (sessionUser.role === "owner" || sessionUser.role === "admin") return true;
  return hasAnyAppPermission(sessionUser.userId, "fantasy");
}
