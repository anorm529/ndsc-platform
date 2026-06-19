"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getUserByEmail,
  verifyPassword,
  updateLastLogin,
  checkRateLimit,
  hasAnyAppPermission,
} from "@ndsc/auth";
import { createCouncilSession } from "@/lib/council-session";

export type LoginState = { error: string };

export async function authenticateCouncil(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit(`council-login:${ip}`, 10, 60 * 15);
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  const user = await getUserByEmail(email);
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Incorrect email or password." };
  }

  if (user.accountStatus !== "active") {
    return { error: "This account is not active." };
  }

  const isOwner = user.role === "owner";
  const hasAccess = isOwner || (await hasAnyAppPermission(user.id, "council"));

  if (!hasAccess) {
    return { error: "You do not have access to the council dashboard." };
  }

  await updateLastLogin(user.id);
  await createCouncilSession(user.id);
  redirect("/council/dashboard");
}
