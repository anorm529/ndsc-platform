import "server-only";

import { dbQuery } from "@/lib/db";

export type BarracudasPlayer = {
  Player: string;
  Gender: "Male" | "Female" | "Unknown";
  Score: number;
  MostRecentYear: number | null;
  YearsIncluded: string;
  __name_norm: string;
  isManual?: boolean;
};

const OBP_PRIOR_AB = 45;
const SLG_PRIOR_AB = 60;

function normName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getNormalizedRecord(record: Record<string, unknown>) {
  const mapped = new Map<string, unknown>();

  Object.entries(record).forEach(([key, value]) => {
    mapped.set(normalizeFieldKey(key), value);
  });

  return mapped;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGender(value: unknown): BarracudasPlayer["Gender"] {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "male" || normalized === "m") {
    return "Male";
  }

  if (normalized === "female" || normalized === "f") {
    return "Female";
  }

  return "Unknown";
}

function getObservedObp(record: Map<string, unknown>) {
  const obp = record.get("obp");
  if (obp != null && String(obp).trim() !== "") {
    return toNumber(obp);
  }

  const totalOb = toNumber(record.get("totalob"));
  const totalAb = toNumber(record.get("totalab") ?? record.get("ab"));
  if (totalAb > 0) {
    return totalOb / totalAb;
  }

  return 0;
}

function getObservedSlg(record: Map<string, unknown>) {
  const slg = record.get("slg");
  if (slg != null && String(slg).trim() !== "") {
    return toNumber(slg);
  }

  const totalAb = toNumber(record.get("totalab") ?? record.get("ab"));
  if (totalAb <= 0) {
    return 0;
  }

  const singles = toNumber(record.get("1b"));
  const doubles = toNumber(record.get("2b"));
  const triples = toNumber(record.get("3b"));
  const homeRuns = toNumber(record.get("hr"));
  const totalBases = singles + doubles * 2 + triples * 3 + homeRuns * 4;

  return totalBases / totalAb;
}

function recencyWeight(year: number, mostRecent: number) {
  if (year === mostRecent) {
    return 1.0;
  }

  if (year === mostRecent - 1) {
    return 0.6;
  }

  return 0.3;
}

function buildWeightedPlayerTable(records: Record<string, unknown>[]) {
  const parsedRows = records
    .map((record) => {
      const normalizedRecord = getNormalizedRecord(record);
      const player = String(normalizedRecord.get("player") ?? "").trim();
      const year = Number(normalizedRecord.get("year"));

      if (!player || !Number.isFinite(year)) {
        return null;
      }

      const totalAb = toNumber(normalizedRecord.get("totalab") ?? normalizedRecord.get("ab"));

      return {
        Player: player,
        Gender: normalizeGender(normalizedRecord.get("gender")),
        Year: year,
        TotalAb: totalAb,
        ObservedObp: getObservedObp(normalizedRecord),
        ObservedSlg: getObservedSlg(normalizedRecord),
        __name_norm: normName(player),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (parsedRows.length === 0) {
    return [] as BarracudasPlayer[];
  }

  const mostRecentYear = Math.max(...parsedRows.map((row) => row.Year));
  const totalAbAcrossRows = parsedRows.reduce((sum, row) => sum + row.TotalAb, 0);
  const obpPrior =
    totalAbAcrossRows > 0
      ? parsedRows.reduce((sum, row) => sum + row.ObservedObp * row.TotalAb, 0) / totalAbAcrossRows
      : 0;
  const slgPrior =
    totalAbAcrossRows > 0
      ? parsedRows.reduce((sum, row) => sum + row.ObservedSlg * row.TotalAb, 0) / totalAbAcrossRows
      : 0;
  const grouped = new Map<string, typeof parsedRows>();

  parsedRows.forEach((row) => {
    const existing = grouped.get(row.__name_norm) || [];
    existing.push(row);
    grouped.set(row.__name_norm, existing);
  });

  return Array.from(grouped.values()).map((group) => {
    const weightedRows = group.map((row) => ({
      ...row,
      YearW: recencyWeight(row.Year, mostRecentYear),
      TrueObp:
        (row.ObservedObp * row.TotalAb + obpPrior * OBP_PRIOR_AB) /
        (row.TotalAb + OBP_PRIOR_AB || 1),
      TrueSlg:
        (row.ObservedSlg * row.TotalAb + slgPrior * SLG_PRIOR_AB) /
        (row.TotalAb + SLG_PRIOR_AB || 1),
    }));
    const weightSum =
      weightedRows.reduce((sum, row) => sum + Math.sqrt(Math.max(row.TotalAb, 1)) * row.YearW, 0) ||
      1;
    const score =
      weightedRows.reduce(
        (sum, row) =>
          sum +
          (row.TrueObp + row.TrueSlg) * Math.sqrt(Math.max(row.TotalAb, 1)) * row.YearW,
        0,
      ) / weightSum;

    return {
      Player: group[0].Player,
      Gender: group[0].Gender,
      Score: score,
      MostRecentYear: Math.max(...group.map((row) => row.Year)),
      YearsIncluded: [...new Set(group.map((row) => String(row.Year)))].sort().join(","),
      __name_norm: group[0].__name_norm,
    } satisfies BarracudasPlayer;
  });
}

export async function getBarracudasPlayers() {
  const result = await dbQuery<Record<string, unknown>>(
    `
    with eligible_players as (
      -- Active players, or anyone assigned to Barracudas for the current year
      select distinct p.id,
        coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.normalized_name), ''), p.id::text) as player_name
      from public.players p
      where p.active = true
         or p.id in (
           select pts.player_id
           from public.player_team_seasons pts
           join public.seasons s on s.id = pts.season_id
           join public.teams t on t.id = pts.team_id
           where (lower(trim(coalesce(t.slug, t.name))) = 'barracudas'
              or lower(trim(t.name)) = 'barracudas')
             and s.year = extract(year from current_date)::int
         )
    ),
    generated_stats as (
      select
        coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.normalized_name), ''), p.id::text) as "Player",
        p.gender as "Gender",
        s.year as "Year",
        coalesce(pss.at_bats, 0) as "Total AB",
        coalesce(pss.obp, 0) as "OBP",
        coalesce(pss.slg, 0) as "SLG",
        coalesce(pss.singles, 0) as "1B",
        coalesce(pss.doubles, 0) as "2B",
        coalesce(pss.triples, 0) as "3B",
        coalesce(pss.home_runs, 0) as "HR"
      from public.player_season_stats pss
      join public.seasons s on s.id = pss.season_id
      join public.teams t on t.id = pss.team_id
      join public.players p on p.id = pss.player_id
      where (lower(trim(coalesce(t.slug, t.name))) = 'barracudas'
         or lower(trim(t.name)) = 'barracudas')
        and p.id in (select id from eligible_players)
    ),
    archived_stats as (
      -- Include historical stats for eligible players matched by name
      select
        a.player as "Player",
        a.gender as "Gender",
        a.year as "Year",
        coalesce(a.at_bats, 0) as "Total AB",
        coalesce(a.obp, 0) as "OBP",
        coalesce(a.slg, 0) as "SLG",
        coalesce(a.singles, 0) as "1B",
        coalesce(a.doubles, 0) as "2B",
        coalesce(a.triples, 0) as "3B",
        coalesce(a.home_runs, 0) as "HR"
      from public.player_season_stats_archive a
      where lower(trim(a.team)) = 'barracudas'
        and trim(lower(regexp_replace(a.player, '\s+', ' ', 'g'))) in (
          select trim(lower(regexp_replace(player_name, '\s+', ' ', 'g')))
          from eligible_players
        )
    )
    select * from generated_stats
    union all
    select * from archived_stats
    order by "Year" desc, "Player" asc
    `,
  );

  return buildWeightedPlayerTable(result.rows);
}
