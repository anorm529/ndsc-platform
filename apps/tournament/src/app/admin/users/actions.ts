"use server";

import { revalidatePath } from "next/cache";
import { setUserAppPermissions } from "@ndsc/auth";

import { ActionState, errorState, successState } from "@/lib/action-state";
import { requireOwnerAdminUser, getCurrentAdminUser, adminPermissionTypes } from "@/lib/current-admin";

export async function saveUserPermissions(_state: ActionState, formData: FormData) {
  try {
    await requireOwnerAdminUser();
    const actor = await getCurrentAdminUser();

    const userId = requireText(formData, "userId");
    const granted = adminPermissionTypes.filter(
      (p) => formData.get(`permission_${p}`) === "on"
    );

    await setUserAppPermissions(userId, "tournament", granted, actor?.id);

    revalidatePath("/admin/users");
    return successState("Permissions saved.");
  } catch (error) {
    return errorState(error);
  }
}

function requireText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}
