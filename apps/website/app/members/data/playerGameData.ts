import { getClubData, type GameDataLookup, type PlayerGameRecord } from "@/lib/ndsc-data";

export type { GameDataLookup, PlayerGameRecord };

export async function fetchPlayerGameDataLookupForTeam(): Promise<GameDataLookup> {
  const clubData = await getClubData();
  return clubData.gameDataLookup;
}
