import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  validateSession,
  createSession,
  deleteSession,
  hasAnyAppPermission,
  getUserAppPermissions,
  isAccountStatus,
} from "@ndsc/auth";
import { mainQuery } from "@/lib/main-db";

export const COOKIE_NAME = "ndsc_council_session";

export type CouncilUser = {
  id: string;
  email: string;
  displayName: string;
  role: "player" | "admin" | "owner";
  accountStatus: "active" | "pending" | "disabled";
  playerId: string | null;
  councilPermissions: Set<string>;
  isOwner: boolean;
};

// ─── Role hierarchy helpers ───────────────────────────────────────────────────
// Chairman and vice chair get full council access (treasurer + secretary).
// Social media officer gets standard access (no treasurer).

const ELEVATED_ROLES = new Set(["chairman", "vice_chair"]);

/** True if the user can access the treasurer section. */
export function hasTreasurerAccess(user: CouncilUser): boolean {
  if (user.isOwner) return true;
  if (user.councilPermissions.has("treasurer")) return true;
  return [...user.councilPermissions].some((p) => ELEVATED_ROLES.has(p));
}

/** True if the user can create/edit meetings and manage action items. */
export function hasSecretaryAccess(user: CouncilUser): boolean {
  if (user.isOwner) return true;
  if (user.councilPermissions.has("secretary")) return true;
  return [...user.councilPermissions].some((p) => ELEVATED_ROLES.has(p));
}

// ─── Session management ───────────────────────────────────────────────────────

async function getRequestMetadata() {
  const h = await headers();
  const deviceName = (h.get("user-agent") || "Unknown device").slice(0, 180);
  const forwardedFor = h.get("x-forwarded-for") || "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || undefined;
  return { deviceName, ipAddress };
}

export async function createCouncilSession(userId: string): Promise<void> {
  const { deviceName, ipAddress } = await getRequestMetadata();
  const rawToken = await createSession(userId, "council", deviceName, ipAddress);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getCouncilUser(): Promise<CouncilUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const sessionUser = await validateSession(rawToken);
  if (!sessionUser) return null;

  if (!isAccountStatus(sessionUser.accountStatus) || sessionUser.accountStatus !== "active") {
    return null;
  }

  const isOwner = sessionUser.role === "owner";

  if (!isOwner) {
    const hasAccess = await hasAnyAppPermission(sessionUser.userId, "council");
    if (!hasAccess) return null;
  }

  const [councilPermissions, nameResult] = await Promise.all([
    isOwner
      ? Promise.resolve(new Set(["chairman", "vice_chair", "treasurer", "captain", "secretary", "social_media"]))
      : getUserAppPermissions(sessionUser.userId, "council"),
    mainQuery<{ registration_name: string | null }>(
      "SELECT registration_name FROM users WHERE id = $1",
      [sessionUser.userId]
    ),
  ]);

  const displayName =
    nameResult.rows[0]?.registration_name ?? sessionUser.email.split("@")[0];

  return {
    id: sessionUser.userId,
    email: sessionUser.email,
    displayName,
    role: sessionUser.role,
    accountStatus: sessionUser.accountStatus,
    playerId: sessionUser.playerId,
    councilPermissions,
    isOwner,
  };
}

export async function requireCouncilUser(): Promise<CouncilUser> {
  const user = await getCouncilUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to dashboard if the user lacks the given permission (ignoring hierarchy — use hasTreasurerAccess/hasSecretaryAccess for elevated roles). */
export async function requireCouncilPermission(
  user: CouncilUser,
  permission: string
): Promise<void> {
  if (!user.isOwner && !user.councilPermissions.has(permission)) {
    redirect("/council/dashboard");
  }
}

/** Gate that allows treasurer + chairman + vice_chair (and owner). */
export async function requireTreasurerAccess(user: CouncilUser): Promise<void> {
  if (!hasTreasurerAccess(user)) redirect("/council/dashboard");
}

/** Gate that allows secretary + chairman + vice_chair (and owner). */
export async function requireSecretaryAccess(user: CouncilUser): Promise<void> {
  if (!hasSecretaryAccess(user)) redirect("/council/dashboard");
}

/** True if the user can manage season enrollment, assign captains, and transition season status. */
export function hasRosterManagementAccess(user: CouncilUser): boolean {
  if (user.isOwner) return true;
  return [...user.councilPermissions].some((p) => ELEVATED_ROLES.has(p));
}

/** Gate for season management and captain assignment (owner/chairman/vice_chair). */
export async function requireRosterManagementAccess(user: CouncilUser): Promise<void> {
  if (!hasRosterManagementAccess(user)) redirect("/council/dashboard");
}

export async function clearCouncilSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (rawToken) await deleteSession(rawToken).catch(() => undefined);
  cookieStore.delete(COOKIE_NAME);
}
