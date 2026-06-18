"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByEmail, verifyPassword, checkRateLimit } from "@ndsc/auth";
import {
  createFantasySession,
  clearSessionCookie,
} from "./auth";

export type LoginResult = { error?: string };

export async function loginAction(
  _prev: LoginResult,
  formData: FormData
): Promise<LoginResult> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit(`fantasy-login:${ip}`, 10, 60 * 15);
  if (!limit.allowed) return { error: "Too many attempts. Try again in 15 minutes." };

  const user = await getUserByEmail(email);
  if (!user || user.accountStatus !== "active") {
    return { error: "Invalid credentials." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { error: "Invalid credentials." };

  const teamName = user.playerId ? undefined : "My Fantasy Team";
  await createFantasySession(user.id, teamName);

  redirect("/home");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
