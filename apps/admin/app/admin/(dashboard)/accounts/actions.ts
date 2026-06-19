"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  hashPassword,
  requireAdminUser,
  type AdminRole,
  type AccountStatus,
  type AdminUser,
} from "@/lib/admin-session";
import { logAdminAudit } from "@/lib/admin-audit";
import { dbQuery } from "@/lib/db";

type TargetUser = {
  id: string;
  role: AdminRole;
  account_status: AccountStatus;
  player_id: string | null;
};

async function getTargetUser(userId: string) {
  const result = await dbQuery<TargetUser>(
    "select id, role, account_status, player_id from users where id = $1 limit 1",
    [userId],
  );

  return result.rows[0] ?? null;
}

function assertCanMutateTarget(adminUser: AdminUser, target: TargetUser) {
  if (adminUser.role === "owner") {
    return;
  }

  if (target.role === "owner") {
    throw new Error("Admins cannot edit owner accounts.");
  }
}

function getUserId(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    throw new Error("Missing user id.");
  }

  return userId;
}

function stringOrNull(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}

function requireConfirmation(formData: FormData, expected: string) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== expected) {
    throw new Error(`Type ${expected} to confirm.`);
  }
}

async function loadAuthorizedTarget(formData: FormData) {
  const adminUser = await requireAdminUser();
  const target = await getTargetUser(getUserId(formData));

  if (!target) {
    throw new Error("User not found.");
  }

  assertCanMutateTarget(adminUser, target);
  return { adminUser, target };
}

export async function approveUserAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);

  await dbQuery(
    "update users set account_status = 'active', updated_at = now() where id = $1",
    [target.id],
  );
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.approve",
    fieldName: "account_status",
    previousValue: target.account_status,
    newValue: "active",
  });
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function disableUserAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  requireConfirmation(formData, "DISABLE");

  if (adminUser.id === target.id) {
    throw new Error("You cannot disable your own account.");
  }

  await dbQuery(
    "update users set account_status = 'disabled', updated_at = now() where id = $1",
    [target.id],
  );
  await dbQuery("delete from user_sessions where user_id = $1", [target.id]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.disable",
    fieldName: "account_status",
    previousValue: target.account_status,
    newValue: "disabled",
  });
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function changeRoleAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  const role = String(formData.get("role") ?? "") as AdminRole;

  if (!["player", "admin", "owner"].includes(role)) {
    throw new Error("Invalid role.");
  }

  if (role === "owner" && adminUser.role !== "owner") {
    throw new Error("Only owners can assign owner role.");
  }

  if (target.role === "owner" && adminUser.role !== "owner") {
    throw new Error("Only owners can change owner accounts.");
  }

  if (adminUser.id === target.id && role !== "owner") {
    throw new Error("You cannot demote your own owner account.");
  }

  await dbQuery("update users set role = $2, updated_at = now() where id = $1", [
    target.id,
    role,
  ]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.role_change",
    fieldName: "role",
    previousValue: target.role,
    newValue: role,
  });
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function relinkUserAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  const playerId = stringOrNull(formData.get("playerId"));

  if (playerId) {
    const player = await dbQuery("select id from players where id = $1 limit 1", [
      playerId,
    ]);

    if (!player.rowCount) {
      throw new Error("Player record not found.");
    }
  }

  await dbQuery("update users set player_id = $2, updated_at = now() where id = $1", [
    target.id,
    playerId,
  ]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: playerId ?? target.player_id,
    action: "account.relink_player",
    fieldName: "player_id",
    previousValue: target.player_id,
    newValue: playerId,
  });
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function updatePlayerProfileAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);

  if (!target.player_id) {
    throw new Error("Link this account to a player before editing profile metadata.");
  }

  const previousProfileResult = await dbQuery<{
    position: string | null;
    bats: string | null;
    throws: string | null;
    shirt_number: string | null;
    profile_image_url: string | null;
    membership_status: string | null;
    member_since: string | null;
  }>(
    `select
      position,
      bats,
      throws,
      shirt_number::text as shirt_number,
      profile_image_url,
      membership_status,
      member_since::text as member_since
    from player_profiles
    where player_id = $1
    limit 1`,
    [target.player_id],
  );
  const previousProfile = previousProfileResult.rows[0] ?? {
    position: null,
    bats: null,
    throws: null,
    shirt_number: null,
    profile_image_url: null,
    membership_status: null,
    member_since: null,
  };
  const nextProfile = {
    position: stringOrNull(formData.get("position")),
    bats: stringOrNull(formData.get("bats")),
    throws: stringOrNull(formData.get("throws")),
    shirt_number: stringOrNull(formData.get("shirtNumber")),
    profile_image_url: stringOrNull(formData.get("profileImageUrl")),
    membership_status: stringOrNull(formData.get("membershipStatus")),
    member_since: stringOrNull(formData.get("memberSince")),
  };

  await dbQuery(
    `insert into player_profiles (
      player_id,
      position,
      bats,
      throws,
      shirt_number,
      profile_image_url,
      membership_status,
      member_since,
      created_at,
      updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8::date, now(), now())
    on conflict (player_id) do update set
      position = excluded.position,
      bats = excluded.bats,
      throws = excluded.throws,
      shirt_number = excluded.shirt_number,
      profile_image_url = excluded.profile_image_url,
      membership_status = excluded.membership_status,
      member_since = excluded.member_since,
      updated_at = now()`,
    [
      target.player_id,
      nextProfile.position,
      nextProfile.bats,
      nextProfile.throws,
      nextProfile.shirt_number,
      nextProfile.profile_image_url,
      nextProfile.membership_status,
      nextProfile.member_since,
    ],
  );

  await Promise.all(
    Object.entries(nextProfile).map(([fieldName, newValue]) => {
      const previousValue =
        previousProfile[fieldName as keyof typeof previousProfile];

      if (previousValue === newValue) {
        return Promise.resolve();
      }

      return logAdminAudit({
        actorUserId: adminUser.id,
        targetUserId: target.id,
        targetPlayerId: target.player_id,
        action: "profile.update",
        fieldName,
        previousValue,
        newValue,
      });
    }),
  );
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function resetPasswordAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  requireConfirmation(formData, "RESET");
  const password = String(formData.get("password") ?? "");

  if (adminUser.role !== "owner") {
    throw new Error("Only owners can set temporary passwords.");
  }

  if (password.length < 12) {
    throw new Error("Use a temporary password of at least 12 characters.");
  }

  const passwordHash = await hashPassword(password);

  await dbQuery("update users set password_hash = $2, updated_at = now() where id = $1", [
    target.id,
    passwordHash,
  ]);
  await dbQuery("delete from password_reset_tokens where user_id = $1", [target.id]);
  await dbQuery("delete from user_sessions where user_id = $1", [target.id]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.password_reset",
    fieldName: "password",
    previousValue: null,
    newValue: "reset_by_admin",
  });
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function revokeSessionAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  requireConfirmation(formData, "REVOKE");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing session id.");
  }

  await dbQuery("delete from user_sessions where id = $1 and user_id = $2", [
    sessionId,
    target.id,
  ]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.session_revoke",
    fieldName: "sessions",
    previousValue: "active_session",
    newValue: "revoked_one",
  });
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function revokeAllSessionsAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  requireConfirmation(formData, "LOGOUT");

  await dbQuery("delete from user_sessions where user_id = $1", [target.id]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.sessions_revoke_all",
    fieldName: "sessions",
    previousValue: "active_sessions",
    newValue: "revoked_all",
  });
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function updateEmailAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);

  if (adminUser.role !== "owner") {
    throw new Error("Only owners can change email addresses.");
  }

  const newEmail = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const existing = await dbQuery(
    "select id from users where lower(email) = $1 and id != $2 limit 1",
    [newEmail, target.id],
  );
  if (existing.rowCount) {
    throw new Error("That email is already in use by another account.");
  }

  const previous = await dbQuery<{ email: string }>(
    "select email from users where id = $1 limit 1",
    [target.id],
  );
  const previousEmail = previous.rows[0]?.email ?? null;

  await dbQuery(
    "update users set email = $2, email_verified = false, updated_at = now() where id = $1",
    [target.id, newEmail],
  );
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.email_change",
    fieldName: "email",
    previousValue: previousEmail,
    newValue: newEmail,
  });
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function deleteUserAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  requireConfirmation(formData, "DELETE");

  if (adminUser.role !== "owner") {
    throw new Error("Only owners can delete accounts.");
  }

  if (adminUser.id === target.id) {
    throw new Error("You cannot delete your own account.");
  }

  if (target.role === "owner") {
    throw new Error("Owner accounts cannot be deleted.");
  }

  // Capture email before deletion for the audit record
  const emailResult = await dbQuery<{ email: string }>(
    "select email from users where id = $1 limit 1",
    [target.id],
  );
  const deletedEmail = emailResult.rows[0]?.email ?? "unknown";

  // Log before delete — target_user_id will be nulled by CASCADE but player_id and values are preserved
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.delete",
    fieldName: "email",
    previousValue: deletedEmail,
    newValue: null,
  });

  // CASCADE handles: user_sessions, password_reset_tokens
  // SET NULL handles: email_events.user_id, admin_audit_log.target_user_id
  // CASCADE handles: admin_notes
  await dbQuery("delete from users where id = $1", [target.id]);

  redirect("/admin/accounts");
}

export async function createAndLinkPlayerAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);

  if (target.player_id) {
    throw new Error("This account is already linked to a player.");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();

  if (displayName.length < 2) {
    throw new Error("Player name must be at least 2 characters.");
  }

  const existing = await dbQuery<{ id: string }>(
    "select id from players where lower(display_name) = lower($1) limit 1",
    [displayName],
  );
  if (existing.rowCount) {
    throw new Error(
      `A player named "${displayName}" already exists. Use the search above to find and link them instead.`,
    );
  }

  const playerResult = await dbQuery<{ id: string }>(
    "insert into players (display_name) values ($1) returning id",
    [displayName],
  );
  const newPlayerId = playerResult.rows[0]?.id;
  if (!newPlayerId) throw new Error("Failed to create player record.");

  await dbQuery("update users set player_id = $2, updated_at = now() where id = $1", [
    target.id,
    newPlayerId,
  ]);
  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: newPlayerId,
    action: "account.create_and_link_player",
    fieldName: "player_id",
    previousValue: null,
    newValue: newPlayerId,
  });
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${target.id}`);
}

export async function searchPlayersForAccountAction(formData: FormData) {
  const userId = getUserId(formData);
  const q = encodeURIComponent(String(formData.get("playerSearch") ?? ""));
  redirect(`/admin/accounts/${userId}?playerSearch=${q}`);
}

export async function addAdminNoteAction(formData: FormData) {
  const { adminUser, target } = await loadAuthorizedTarget(formData);
  const note = String(formData.get("note") ?? "").trim();

  if (note.length < 2) {
    throw new Error("Add a note before saving.");
  }

  try {
    await dbQuery(
      `insert into admin_notes (
        actor_user_id,
        target_user_id,
        target_player_id,
        note
      )
      values ($1, $2, $3, $4)`,
      [adminUser.id, target.id, target.player_id, note],
    );
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
      throw new Error("Run the admin_notes migration before saving notes.");
    }

    throw error;
  }

  await logAdminAudit({
    actorUserId: adminUser.id,
    targetUserId: target.id,
    targetPlayerId: target.player_id,
    action: "account.note_add",
    fieldName: "note",
    previousValue: null,
    newValue: "note_added",
  });
  revalidatePath(`/admin/accounts/${target.id}`);
}
