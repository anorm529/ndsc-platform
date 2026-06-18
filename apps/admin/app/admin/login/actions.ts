"use server";

import { redirect } from "next/navigation";
import { getUserByEmail, verifyPassword, updateLastLogin } from "@ndsc/auth";
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

  const user = await getUserByEmail(email);
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
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
