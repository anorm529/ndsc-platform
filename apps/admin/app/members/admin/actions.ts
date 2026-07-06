"use server";

import {
  archivePlayerSeasonStats,
  createNeonRecord,
  deleteNeonRecord,
  refreshPlayerSeasonStats,
  updateNeonRecord,
} from "@/lib/neon-admin";
import { assertAdminPermission } from "@/lib/permissions";

export async function createNeonRecordAction(formData: FormData) {
  await assertAdminPermission("database");
  await createNeonRecord(formData);
}

export async function updateNeonRecordAction(formData: FormData) {
  await assertAdminPermission("database");
  await updateNeonRecord(formData);
}

export async function deleteNeonRecordAction(formData: FormData) {
  await assertAdminPermission("database");
  const confirmation = String(formData.get("confirmation") || "");

  if (confirmation !== "DELETE") {
    throw new Error("Type DELETE to confirm this destructive action.");
  }

  await deleteNeonRecord(formData);
}

export async function refreshSeasonStatsAction(formData: FormData) {
  await assertAdminPermission("database");
  const rawYear = String(formData.get("year") || "").trim();
  const rawTeamSlug = String(formData.get("teamSlug") || "").trim();
  const year = rawYear ? Number(rawYear) : undefined;

  if (rawYear && !Number.isInteger(year)) {
    throw new Error("Year must be a whole number.");
  }

  await refreshPlayerSeasonStats(year, rawTeamSlug || undefined);
}

export async function archiveSeasonStatsAction(formData: FormData) {
  await assertAdminPermission("database");
  const year = Number(formData.get("year"));
  const archivedBy = String(formData.get("archivedBy") || "admin").trim();

  if (!Number.isInteger(year)) {
    throw new Error("Year is required.");
  }

  await archivePlayerSeasonStats(year, archivedBy || "admin");
}
