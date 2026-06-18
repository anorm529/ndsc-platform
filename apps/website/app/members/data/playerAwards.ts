import {
  getClubData,
  pickPlayerRecordId,
  type AwardsLookup,
} from "@/lib/ndsc-data";

export type { AwardsLookup };
export { pickPlayerRecordId };

export async function fetchAwardsLookupForTeam(teamSlug: string): Promise<AwardsLookup> {
  const clubData = await getClubData();
  const normalizedTeam = teamSlug.toLowerCase().trim();

  if (
    normalizedTeam === "buccaneers" ||
    normalizedTeam === "barracudas" ||
    normalizedTeam === "sluggers"
  ) {
    return clubData.awardsLookupByTeam[normalizedTeam];
  }

  return { byName: {}, byRecordId: {} };
}
