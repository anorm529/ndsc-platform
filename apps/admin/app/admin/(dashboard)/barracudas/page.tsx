import { BarracudasDashboard } from "@/components/admin/barracudas-dashboard";
import { getBarracudasPlayers, type BarracudasPlayer } from "@/lib/barracudas";
import { requireAdminPermission } from "@/lib/permissions";

export default async function BarracudasPage() {
  await requireAdminPermission("barracudas");
  let initialPlayers: BarracudasPlayer[] = [];
  let initialError = "";

  try {
    initialPlayers = await getBarracudasPlayers();
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "Unable to load Barracudas players.";
  }

  return (
    <BarracudasDashboard
      initialPlayers={initialPlayers}
      initialError={initialError}
    />
  );
}
