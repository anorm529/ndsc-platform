import "server-only";

import { redirect } from "next/navigation";
import {
  getUserAppPermissions,
  ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  type AdminPermission,
} from "@ndsc/auth";
import { getAdminUser } from "@/lib/admin-session";

export { ADMIN_PERMISSIONS, type AdminPermission };

export const adminPermissionLabels = PERMISSION_LABELS.admin as Record<AdminPermission, string>;

export async function getAdminUserPermissions(userId: string): Promise<Set<AdminPermission>> {
  const perms = await getUserAppPermissions(userId, "admin");
  return perms as Set<AdminPermission>;
}

/** Returns true for owners (bypass) or users with the specific permission. */
export async function hasAdminPermission(permission: AdminPermission): Promise<boolean> {
  const user = await getAdminUser();
  if (!user) return false;
  if (user.role === "owner") return true;
  const perms = await getAdminUserPermissions(user.id);
  return perms.has(permission);
}

/** Redirects to /admin/overview if the current user lacks the permission. Use in page components. */
export async function requireAdminPermission(permission: AdminPermission): Promise<void> {
  if (!(await hasAdminPermission(permission))) redirect("/admin/overview");
}

/** Throws if the current user lacks the permission. Use in server actions. */
export async function assertAdminPermission(permission: AdminPermission): Promise<void> {
  if (!(await hasAdminPermission(permission))) {
    throw new Error("You don't have permission to perform this action.");
  }
}
