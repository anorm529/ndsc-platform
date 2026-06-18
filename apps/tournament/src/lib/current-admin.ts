import { cookies } from "next/headers";
import { validateSession, isAccountStatus } from "@ndsc/auth";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { prisma } from "@/lib/db";

export type CurrentAdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export const adminRoles = ["owner", "tournament_admin", "scorekeeper", "viewer"] as const;
export type AdminRole = (typeof adminRoles)[number];

const roleRank: Record<AdminRole, number> = {
  viewer: 0,
  scorekeeper: 1,
  tournament_admin: 2,
  owner: 3,
};

function mapRoleToTournamentRole(role: string): AdminRole | null {
  if (role === "owner") return "owner";
  if (role === "admin") return "tournament_admin";
  return null;
}

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const sessionUser = await validateSession(rawToken);
  if (!sessionUser || !isAccountStatus(sessionUser.accountStatus) || sessionUser.accountStatus !== "active") return null;

  const tournamentRole = mapRoleToTournamentRole(sessionUser.role);
  if (!tournamentRole) return null;

  // Derive display name: use email prefix as fallback (no main DB query needed)
  const name = sessionUser.email.split("@")[0] ?? sessionUser.email;

  return {
    id: sessionUser.userId,
    name,
    email: sessionUser.email,
    role: tournamentRole,
  };
}

export async function canManageAdminUsers() {
  const user = await getCurrentAdminUser();
  return user?.role === "owner";
}

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
  const user = await getCurrentAdminUser();
  return user?.role ?? null;
}

export async function canUseMinimumRole(minimumRole: AdminRole) {
  const role = await getCurrentAdminRole();
  return Boolean(role && roleRank[role] >= roleRank[minimumRole]);
}

export async function requireMinimumRole(minimumRole: AdminRole) {
  const allowed = await canUseMinimumRole(minimumRole);
  if (!allowed) throw new Error(`Only ${formatRole(minimumRole)}s and owners can do that.`);
}

export async function requireOwnerAdminUser() {
  if (!(await canManageAdminUsers())) throw new Error("Only owners can manage admin users.");
}

export function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

export function isAdminRole(value: string): value is AdminRole {
  return adminRoles.includes(value as AdminRole);
}

// ─── Granular permissions ─────────────────────────────────────────────────────

export const adminPermissionTypes = ["tournaments", "schedule", "scores", "check_in"] as const;
export type AdminPermissionType = (typeof adminPermissionTypes)[number];

export const permissionLabels: Record<AdminPermissionType, string> = {
  tournaments: "Tournament management",
  schedule: "Schedule & templates",
  scores: "Score entry",
  check_in: "Check-in",
};

export async function getUserPermissions(userId: string): Promise<Set<AdminPermissionType>> {
  const rows = await prisma.adminPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return new Set(rows.map((r) => r.permission as AdminPermissionType));
}

export async function hasPermission(permission: AdminPermissionType): Promise<boolean> {
  const user = await getCurrentAdminUser();
  if (!user) return false;
  if (user.role === "owner") return true;
  const perms = await getUserPermissions(user.id);
  return perms.has(permission);
}

export async function requirePermission(permission: AdminPermissionType): Promise<void> {
  if (!(await hasPermission(permission))) throw new Error("You don't have permission to do that.");
}
