"use server";

import { redirect } from "next/navigation";
import { getUserByEmail, verifyPassword } from "@ndsc/auth";
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
