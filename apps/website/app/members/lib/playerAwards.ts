export type PlayerAward = {
  year: number;
  award: string;
  team?: string | null;
  playerNameKey?: string;
};

export type AwardsByYear = {
  year: number;
  awards: { award: string; team?: string | null }[];
};

export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeRecordId(value: string): string {
  return value.trim().toLowerCase();
}

export function groupAwardsByYear(awards: PlayerAward[]): AwardsByYear[] {
  const grouped = new Map<number, { award: string; team?: string | null }[]>();

  for (const entry of awards) {
    if (!Number.isFinite(entry.year)) continue;
    const awardName = entry.award?.trim();
    if (!awardName) continue;

    const bucket = grouped.get(entry.year) ?? [];
    bucket.push({ award: awardName, team: entry.team ?? null });
    grouped.set(entry.year, bucket);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, awardEntries]) => ({
      year,
      awards: [...awardEntries].sort((a, b) => a.award.localeCompare(b.award)),
    }));
}
