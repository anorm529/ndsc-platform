"use server";

import { revalidatePath } from "next/cache";
import { logAdminAudit } from "@/lib/admin-audit";
import { requireAdminUser } from "@/lib/admin-session";
import { dbQuery } from "@/lib/db";

function requireConfirmation(formData: FormData, expected: string) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== expected) {
    throw new Error(`Type ${expected} to confirm.`);
  }
}

export async function deleteExpiredSessionsAction(formData: FormData) {
  const adminUser = await requireAdminUser();
  requireConfirmation(formData, "DELETE SESSIONS");

  const result = await dbQuery<{ id: string }>(
    "delete from user_sessions where expires_at <= now() returning id",
  );

  await logAdminAudit({
    actorUserId: adminUser.id,
    action: "cleanup.expired_sessions",
    fieldName: "user_sessions",
    previousValue: result.rowCount ?? 0,
    newValue: 0,
  });
  revalidatePath("/admin/cleanup");
  revalidatePath("/admin/overview");
}

export async function deleteExpiredResetTokensAction(formData: FormData) {
  const adminUser = await requireAdminUser();
  requireConfirmation(formData, "DELETE TOKENS");

  const result = await dbQuery<{ id: string }>(
    `delete from password_reset_tokens
    where used_at is null and expires_at <= now()
    returning id`,
  );

  await logAdminAudit({
    actorUserId: adminUser.id,
    action: "cleanup.expired_reset_tokens",
    fieldName: "password_reset_tokens",
    previousValue: result.rowCount ?? 0,
    newValue: 0,
  });
  revalidatePath("/admin/cleanup");
  revalidatePath("/admin/overview");
}

export async function deleteOldEmailEventsAction(formData: FormData) {
  const adminUser = await requireAdminUser();
  requireConfirmation(formData, "DELETE EMAIL EVENTS");

  const result = await dbQuery<{ id: string }>(
    `delete from email_events
    where created_at < now() - interval '180 days'
    returning id`,
  ).catch((error) => {
    if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
      return { rowCount: 0 };
    }
    throw error;
  });

  await logAdminAudit({
    actorUserId: adminUser.id,
    action: "cleanup.old_email_events",
    fieldName: "email_events",
    previousValue: result.rowCount ?? 0,
    newValue: 0,
  });
  revalidatePath("/admin/cleanup");
  revalidatePath("/admin/email");
  revalidatePath("/admin/overview");
}
