import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  validateSession,
  createSession,
  deleteSession,
  getUserSessions,
  deleteAllUserSessions,
  hashPassword,
  verifyPassword,
  isAccountStatus,
} from "@ndsc/auth";

export { hashPassword, verifyPassword };

export const COOKIE_NAME = "ndsc_admin_session";

export type AdminRole = "admin" | "owner";
export type AccountStatus = "active" | "pending" | "disabled";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  accountStatus: AccountStatus;
  playerId: string | null;
};

async function getRequestMetadata() {
  const h = await headers();
  const deviceName = (h.get("user-agent") || "Unknown device").slice(0, 180);
  const forwardedFor = h.get("x-forwarded-for") || "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || undefined;
  return { deviceName, ipAddress };
}

export async function createAdminSession(userId: string) {
  const { deviceName, ipAddress } = await getRequestMetadata();
  const rawToken = await createSession(userId, "admin", deviceName, ipAddress);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const sessionUser = await validateSession(rawToken);
  if (!sessionUser) return null;

  if (!isAccountStatus(sessionUser.accountStatus) || sessionUser.accountStatus !== "active") return null;
  if (sessionUser.role !== "admin" && sessionUser.role !== "owner") return null;

  return {
    id: sessionUser.userId,
    email: sessionUser.email,
    role: sessionUser.role as AdminRole,
    accountStatus: sessionUser.accountStatus,
    playerId: sessionUser.playerId,
  };
}

export async function requireAdminUser(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminUser());
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (rawToken) await deleteSession(rawToken).catch(() => undefined);
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminUserSessions(userId: string) {
  return getUserSessions(userId);
}

export async function clearOtherAdminSessions(userId: string) {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(COOKIE_NAME)?.value;
  await deleteAllUserSessions(userId, currentToken);
}
