"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByEmail, verifyPassword, updateLastLogin, checkRateLimit } from "@ndsc/auth";
import { createAdminSession } from "@/lib/admin-session";

export type LoginState = {
  error: string;
};

export async function authenticateAdmin(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit(`admin-login:${ip}`, 10, 60 * 15);
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  const user = await getUserByEmail(email);
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    // Constant-time delay prevents timing attacks that distinguish "user not found" from "wrong password"
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { error: "Incorrect email or password." };
  }

  if (user.accountStatus !== "active") {
    return { error: "This account is not active." };
  }

  if (user.role !== "admin" && user.role !== "owner") {
    return { error: "This account is not authorized for the admin portal." };
  }

  await updateLastLogin(user.id);
  await createAdminSession(user.id);
  redirect("/admin/overview");
}
