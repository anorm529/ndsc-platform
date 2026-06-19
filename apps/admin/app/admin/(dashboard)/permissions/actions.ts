"use server";

import { revalidatePath } from "next/cache";
import { setUserAppPermissions, ALL_PERMISSIONS, type App } from "@ndsc/auth";
import { requireAdminUser } from "@/lib/admin-session";

export async function saveUserAppPermissionsAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  try {
    const actor = await requireAdminUser();
    if (actor.role !== "owner") throw new Error("Only owners can manage permissions.");

    const userId = formData.get("userId")?.toString().trim();
    const app = formData.get("app")?.toString().trim() as App;

    if (!userId || !app || !ALL_PERMISSIONS[app]) {
      throw new Error("Invalid request.");
    }

    const granted = ALL_PERMISSIONS[app].filter(
      (p) => formData.get(`perm_${p}`) === "on"
    );

    await setUserAppPermissions(userId, app, granted, actor.id);
    revalidatePath("/admin/permissions");
    return { success: "Permissions saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save." };
  }
}
