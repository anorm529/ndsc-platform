"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByEmail, verifyPassword, createSession, updateLastLogin } from "@ndsc/auth";
import { ActionState, errorState } from "@/lib/action-state";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

function mapRoleToTournamentRole(role: string): "owner" | "tournament_admin" | null {
  if (role === "owner") return "owner";
  if (role === "admin") return "tournament_admin";
  return null;
}

export async function login(_state: ActionState, formData: FormData) {
  let redirectTo = "/admin";

  try {
    const email = readString(formData, "email").trim().toLowerCase();
    const password = readString(formData, "password");
    const next = readString(formData, "next") || "/admin";

    if (!email) throw new Error("Email is required.");

    const user = await getUserByEmail(email);
    if (!user) throw new Error("Those login details are not correct.");

    if (user.accountStatus !== "active") {
      throw new Error("Your account is not active. Contact the administrator.");
    }

    const tournamentRole = mapRoleToTournamentRole(user.role);
    if (!tournamentRole) {
      throw new Error("You do not have permission to access the admin area.");
    }

    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new Error("Those login details are not correct.");
    }

    await updateLastLogin(user.id);
    const rawToken = await createSession(user.id, "tournament");

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, rawToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 12,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    redirectTo = next.startsWith("/admin") ? next : "/admin";
  } catch (error) {
    return errorState(error);
  }

  redirect(redirectTo);
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    const { deleteSession } = await import("@ndsc/auth");
    await deleteSession(token).catch(() => undefined);
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/");
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
