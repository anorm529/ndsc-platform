import { BarracudasDashboard } from "@/components/admin/barracudas-dashboard";
import { getBarracudasPlayers, type BarracudasPlayer } from "@/lib/barracudas";

export default async function BarracudasPage() {
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
