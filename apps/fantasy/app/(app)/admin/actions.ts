"use server";

import { db } from "@/app/lib/fantasy-db";
import { requireSession } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasFantasyPermission } from "@/app/lib/permissions";

export async function deleteLeagueAction(leagueId: string) {
  await requireSession();
  if (!(await hasFantasyPermission("leagues"))) redirect("/home");

  await db.fantasyLeague.delete({ where: { id: leagueId } });

  revalidatePath("/admin");
  revalidatePath("/home");
  redirect("/admin");
}
