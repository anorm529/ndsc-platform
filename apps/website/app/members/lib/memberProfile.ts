import type { AuthenticatedUser } from "@/lib/auth";
import {
  type ClubData,
  type ClubTeamSlug,
  type GameDataLookup,
  type Match,
  type PlayerStat,
} from "@/lib/ndsc-data";
import { ACHIEVEMENT_DEFINITIONS } from "@/app/members/lib/achievementDefinitions";
import { normalizePlayerName, normalizeRecordId, type PlayerAward } from "@/app/members/lib/playerAwards";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export type Achievement = {
  title: string;
  tier: AchievementTier;
  unlocked: boolean;
  progress: number;
  target: number;
  detail: string;
};

const ACHIEVEMENT_TIER_WEIGHT: Record<AchievementTier, number> = {
  platinum: 4,
  gold: 3,
  silver: 2,
  bronze: 1,
};

export function sortAchievementsByTier(a: Achievement, b: Achievement) {
  return (
    ACHIEVEMENT_TIER_WEIGHT[b.tier] - ACHIEVEMENT_TIER_WEIGHT[a.tier] ||
    b.target - a.target ||
    b.progress - a.progress ||
    a.title.localeCompare(b.title)
  );
}

export type SeasonSummary = {
  season: string;
  games: number;
  hits: number;
  rbi: number;
  runs: number;
  walks: number;
  homeRuns: number;
  innings: number;
  uao: number;
  ao: number;
  outs: number;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
};

export type MemberProfileFields = {
  position?: string | null;
  bats?: string | null;
  throws?: string | null;
  memberSince?: number | null;
};

export type MemberProfile = {
  user: AuthenticatedUser;
  playerStats: PlayerStat[];
  seasonSummaries: SeasonSummary[];
  currentSeason?: SeasonSummary;
  previousSeason?: SeasonSummary;
  career: SeasonSummary;
  activeTeamSlug?: ClubTeamSlug;
  activeTeamName: string;
  activeTeamDivision?: string;
  awards: PlayerAward[];
  gameRecords: GameDataLookup["byName"][string];
  achievements: Achievement[];
  timeline: Array<{ year: string; label: string }>;
  personalRecords: Array<{ label: string; value: string }>;
  teamAverages: Pick<SeasonSummary, "avg" | "obp" | "ops">;
  rankings: Array<{ label: string; value: string }>;
  upcomingTeamMatches: Match[];
  recentTeamResults: Match[];
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function statYear(stat: PlayerStat) {
  const year = Number(stat.season);
  return Number.isFinite(year) ? year : 0;
}

function isBlank(v: unknown) {
  return v === null || v === undefined || String(v).trim() === "";
}

function parseDate(value: unknown) {
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function combineStats(stats: PlayerStat[], season: string): SeasonSummary {
  const games = stats.reduce((total, row) => total + num(row.gamesPlayed), 0);
  const singles = stats.reduce((total, row) => total + num(row.singles_1b), 0);
  const doubles = stats.reduce((total, row) => total + num(row.doubles_2b), 0);
  const triples = stats.reduce((total, row) => total + num(row.triples_3b), 0);
  const hr = stats.reduce((total, row) => total + num(row.hr), 0);
  const hits = stats.reduce((total, row) => total + num(row.hits), 0);
  const walks = stats.reduce((total, row) => total + num(row.bb), 0);
  const atBats = stats.reduce((total, row) => total + num(row.ab), 0);
  const uao = stats.reduce((total, row) => total + num(row.uao), 0);
  const ao = stats.reduce((total, row) => total + num(row.ao), 0);
  const outs = stats.reduce((total, row) => total + num(row.outs), 0);
  const totalBases = singles + doubles * 2 + triples * 3 + hr * 4;
  const obp = safeRate(hits + walks, atBats + walks);
  const slg = safeRate(totalBases, atBats);

  return {
    season,
    games,
    hits,
    rbi: stats.reduce((total, row) => total + num(row.rbi), 0),
    runs: stats.reduce((total, row) => total + num(row.runs), 0),
    walks,
    homeRuns: hr,
    innings: stats.reduce((total, row) => total + num(row.innings), 0),
    uao,
    ao,
    outs: outs || uao + ao,
    avg: safeRate(hits, atBats),
    obp,
    slg,
    ops: obp != null && slg != null ? obp + slg : null,
  };
}

function groupBySeason(stats: PlayerStat[]) {
  const grouped = new Map<string, PlayerStat[]>();
  for (const row of stats) {
    const season = String(row.season ?? "Unknown");
    grouped.set(season, [...(grouped.get(season) ?? []), row]);
  }

  return Array.from(grouped.entries())
    .map(([season, rows]) => combineStats(rows, season))
    .sort((a, b) => Number(b.season) - Number(a.season));
}

function rankPlayer(
  rows: PlayerStat[],
  playerKey: string,
  label: string,
  getter: (row: PlayerStat) => number
) {
  const ranked = rows
    .map((row) => ({
      key: normalizeRecordId(String(row.recordId ?? "")),
      name: normalizePlayerName(row.playerName ?? ""),
      value: getter(row),
    }))
    .filter((row) => Number.isFinite(row.value) && row.value > 0)
    .sort((a, b) => b.value - a.value);

  const index = ranked.findIndex((row) => row.key === playerKey || row.name === playerKey);
  return index >= 0 ? { label, value: `#${index + 1}` } : { label, value: "—" };
}

function hasProfileValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function buildAchievements(
  career: SeasonSummary,
  awards: PlayerAward[],
  records: GameDataLookup["byName"][string],
  profileFields?: MemberProfileFields
) {
  const bestHits = Math.max(0, ...records.map((row) => num(row.singles) + num(row.doubles) + num(row.triples) + num(row.hr)));
  const bestRuns = Math.max(0, ...records.map((row) => num(row.runs)));
  const bestRbi = Math.max(0, ...records.map((row) => num(row.rbi)));
  const bestDefensiveOuts = Math.max(
    0,
    ...records.map((row) => num(row.outs) || num(row["Total Outs"]) || num(row.uao) + num(row.ao))
  );
  const mvpAwards = awards.filter((award) => /mvp/i.test(award.award)).length;
  const profileCompleteFields = [
    profileFields?.position,
    profileFields?.bats,
    profileFields?.throws,
    profileFields?.memberSince,
  ].filter(hasProfileValue).length;
  const context = {
    career,
    awards,
    records,
    bestHits,
    bestRuns,
    bestRbi,
    bestDefensiveOuts,
    mvpAwards,
    profileCompleteFields,
  };

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const progress = definition.progress(context);
    return {
      title: definition.title,
      tier: definition.tier,
      unlocked: progress >= definition.target,
      progress: Math.min(progress, definition.target),
      target: definition.target,
      detail: definition.detail,
    };
  });
}

function buildTimeline(stats: PlayerStat[], awards: PlayerAward[], career: SeasonSummary) {
  const years = stats.map(statYear).filter(Boolean).sort((a, b) => a - b);
  const timeline: Array<{ year: string; label: string }> = [];

  if (years[0]) timeline.push({ year: String(years[0]), label: "Joined NDSC stats record" });
  if (career.hits > 0 && years[0]) timeline.push({ year: String(years[0]), label: "First hit recorded" });

  const debutByTeam = new Map<string, number>();
  for (const row of stats) {
    if (!row.teamSlug) continue;
    const year = statYear(row);
    if (!year) continue;
    debutByTeam.set(row.teamSlug, Math.min(debutByTeam.get(row.teamSlug) ?? year, year));
  }
  for (const [team, year] of debutByTeam) {
    timeline.push({ year: String(year), label: `${team.charAt(0).toUpperCase()}${team.slice(1)} debut` });
  }

  for (const award of awards.slice(0, 4)) {
    timeline.push({ year: String(award.year), label: `${award.award} winner` });
  }

  if (career.hits >= 50) timeline.push({ year: "Career", label: "50th career hit" });
  if (career.games >= 100) timeline.push({ year: "Career", label: "100 career games" });

  return timeline
    .filter((entry, index, arr) => arr.findIndex((other) => other.year === entry.year && other.label === entry.label) === index)
    .slice(0, 8);
}

export function fmtRate(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(3).replace(/^0/, "");
}

export function fmtInt(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toString();
}

export function buildMemberProfile(
  user: AuthenticatedUser,
  clubData: ClubData,
  profileFields?: MemberProfileFields
): MemberProfile {
  const playerIdKey = normalizeRecordId(user.playerId);
  const playerNameKey = normalizePlayerName(user.playerName);
  const playerStats = clubData.stats.filter((row) => {
    const rowId = normalizeRecordId(String(row.recordId ?? ""));
    const rowName = normalizePlayerName(row.playerName ?? "");
    return rowId === playerIdKey || rowName === playerNameKey;
  });
  const seasonSummaries = groupBySeason(playerStats);
  const currentSeason = seasonSummaries[0];
  const previousSeason = seasonSummaries[1];
  const career = combineStats(playerStats, "Career");
  const latestStat = [...playerStats].sort((a, b) => statYear(b) - statYear(a))[0];
  const activeTeamSlug = latestStat?.teamSlug as ClubTeamSlug | undefined;
  const activeTeam = activeTeamSlug ? clubData.teamSummaries[activeTeamSlug]?.team : undefined;
  const awards =
    clubData.awardsLookup.byRecordId[playerIdKey] ??
    clubData.awardsLookup.byName[playerNameKey] ??
    [];
  const gameRecords =
    clubData.gameDataLookup.byRecordId[playerIdKey] ??
    clubData.gameDataLookup.byName[playerNameKey] ??
    [];
  const currentSeasonRows = latestStat
    ? clubData.stats.filter(
        (row) => String(row.season) === String(latestStat.season) && row.teamSlug === latestStat.teamSlug
      )
    : [];
  const teamAverages = combineStats(currentSeasonRows, "Team Average");
  const rankingKey = playerIdKey || playerNameKey;
  const rankings = [
    rankPlayer(currentSeasonRows, rankingKey, "AVG", (row) => num(row.avg)),
    rankPlayer(currentSeasonRows, rankingKey, "RBI", (row) => num(row.rbi)),
    rankPlayer(currentSeasonRows, rankingKey, "OPS", (row) => num(row.ops)),
  ];
  const now = Date.now();
  const teamMatches = activeTeamSlug
    ? clubData.fixtures.filter((match) => match.teamSlug === activeTeamSlug)
    : [];

  return {
    user,
    playerStats,
    seasonSummaries,
    currentSeason,
    previousSeason,
    career,
    activeTeamSlug,
    activeTeamName: activeTeam?.name ?? "Unassigned",
    activeTeamDivision: latestStat?.division ?? activeTeam?.division,
    awards,
    gameRecords,
    achievements: buildAchievements(career, awards, gameRecords, profileFields),
    timeline: buildTimeline(playerStats, awards, career),
    personalRecords: [
      {
        label: "Most Hits In Game",
        value: fmtInt(Math.max(0, ...gameRecords.map((row) => num(row.singles) + num(row.doubles) + num(row.triples) + num(row.hr)))),
      },
      { label: "Most RBI In Game", value: fmtInt(Math.max(0, ...gameRecords.map((row) => num(row.rbi)))) },
      { label: "Most Runs In Game", value: fmtInt(Math.max(0, ...gameRecords.map((row) => num(row.runs)))) },
      { label: "Games Logged", value: fmtInt(gameRecords.length) },
    ],
    teamAverages,
    rankings,
    upcomingTeamMatches: teamMatches
      .filter((match) => parseDate(match.date) >= now && isBlank(match.result))
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))
      .slice(0, 4),
    recentTeamResults: teamMatches
      .filter((match) => !isBlank(match.result))
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 4),
  };
}
