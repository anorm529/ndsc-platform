"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/admin/section-card";
import { serializeCsv } from "@/lib/csv";

type AggregatedPlayer = {
  Player: string;
  Gender: "Male" | "Female" | "Unknown";
  Score: number;
  MostRecentYear: number | null;
  YearsIncluded: string;
  __name_norm: string;
  isManual?: boolean;
};

type SelectionState = {
  selected: boolean;
  locked: boolean;
};

type ResultPlayer = AggregatedPlayer & {
  position: number;
  selectionType: "Locked" | "Ranked";
  selectionReason: string;
};

type GeneratedLineup = {
  availableRanked: AggregatedPlayer[];
  starting: ResultPlayer[];
  substitutes: ResultPlayer[];
  warnings: string[];
};

type ValidationState = {
  blocking: string[];
  advisory: string[];
};

type BenchStrategy = {
  nextBestMale: AggregatedPlayer | null;
  nextBestFemale: AggregatedPlayer | null;
  benchCore: AggregatedPlayer[];
};

type FieldPositionCode = "P" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "LCF" | "RCF" | "RF";

type LineupRole = FieldPositionCode | "EH" | "SUB" | "";

type LineupHistoryItem = {
  id: string;
  createdAt: string;
  lineup: GeneratedLineup;
};

const TOTAL_STARTING_SLOTS = 10;
const MIN_FEMALE_STARTERS = 4;
const MARC_MESSAGE = "Hey Marc. Welcome to your new toy. Build your dream team!";
const LINEUP_SLOT_WEIGHTS = [1.16, 1.12, 1.08, 1.05, 1.02, 1, 0.98, 0.96, 0.94, 0.92] as const;
const FIELD_POSITIONS: FieldPositionCode[] = ["P", "C", "1B", "2B", "3B", "SS", "LF", "LCF", "RCF", "RF"];
const LINEUP_ROLES: Array<{ value: LineupRole; label: string }> = [
  { value: "", label: "Choose role" },
  ...FIELD_POSITIONS.map((position) => ({ value: position, label: position })),
  { value: "EH", label: "EH" },
  { value: "SUB", label: "Sub" },
];
const DIAMOND_POSITIONS: Record<FieldPositionCode, { x: number; y: number }> = {
  P: { x: 50, y: 90 },
  C: { x: 50, y: 126 },
  "1B": { x: 72, y: 86 },
  "2B": { x: 62, y: 68 },
  "3B": { x: 28, y: 86 },
  SS: { x: 38, y: 68 },
  LF: { x: 17, y: 48 },
  LCF: { x: 36, y: 35 },
  RCF: { x: 64, y: 35 },
  RF: { x: 83, y: 48 },
};
const REQUIRED_COLUMNS = [
  "player_season_stats",
  "player_season_stats_archive",
  "players",
  "teams",
  "seasons",
] as const;

function normName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function alternateLineup<T extends AggregatedPlayer>(
  males: T[],
  females: T[],
  totalSlots: number,
  startGender: "Male" | "Female",
) {
  const out: T[] = [];
  let maleIndex = 0;
  let femaleIndex = 0;
  let turnMale = startGender === "Male";

  while (out.length < totalSlots && (maleIndex < males.length || femaleIndex < females.length)) {
    if (turnMale && maleIndex < males.length) {
      out.push(males[maleIndex]);
      maleIndex += 1;
    } else if (!turnMale && femaleIndex < females.length) {
      out.push(females[femaleIndex]);
      femaleIndex += 1;
    } else if (maleIndex < males.length) {
      out.push(males[maleIndex]);
      maleIndex += 1;
    } else if (femaleIndex < females.length) {
      out.push(females[femaleIndex]);
      femaleIndex += 1;
    }

    turnMale = !turnMale;
  }

  return out;
}

function alternateFromRanked<T extends AggregatedPlayer>(ranked: T[]) {
  const males = ranked.filter((player) => player.Gender === "Male");
  const females = ranked.filter((player) => player.Gender === "Female");
  const startGender =
    (males[0]?.Score || -1) >= (females[0]?.Score || -1) ? "Male" : "Female";
  return alternateLineup(males, females, ranked.length, startGender);
}

function sumScores(players: AggregatedPlayer[]) {
  return players.reduce((sum, player) => sum + player.Score, 0);
}

function scoreOrderedLineup(players: AggregatedPlayer[]) {
  return players.reduce(
    (sum, player, index) => sum + player.Score * (LINEUP_SLOT_WEIGHTS[index] ?? 0.9),
    0,
  );
}

function chooseBestOrder(males: AggregatedPlayer[], females: AggregatedPlayer[], totalSlots: number) {
  const options: AggregatedPlayer[][] = [];

  if (males.length > 0) {
    options.push(alternateLineup(males, females, totalSlots, "Male"));
  }

  if (females.length > 0) {
    options.push(alternateLineup(males, females, totalSlots, "Female"));
  }

  return options.sort((left, right) => scoreOrderedLineup(right) - scoreOrderedLineup(left))[0] || [];
}

function pickBestStarterPool(availableRanked: AggregatedPlayer[], lockedNames: Set<string>) {
  const lockedPlayers = availableRanked.filter((player) => lockedNames.has(player.__name_norm));
  const lockedFemales = lockedPlayers.filter((player) => player.Gender === "Female");
  const lockedMales = lockedPlayers.filter((player) => player.Gender === "Male");
  const unlockedFemales = availableRanked.filter(
    (player) => !lockedNames.has(player.__name_norm) && player.Gender === "Female",
  );
  const unlockedMales = availableRanked.filter(
    (player) => !lockedNames.has(player.__name_norm) && player.Gender === "Male",
  );

  const minFemaleCount = Math.max(
    MIN_FEMALE_STARTERS,
    lockedFemales.length,
    TOTAL_STARTING_SLOTS - (lockedMales.length + unlockedMales.length),
  );
  const maxFemaleCount = Math.min(
    lockedFemales.length + unlockedFemales.length,
    TOTAL_STARTING_SLOTS - lockedMales.length,
  );

  let bestPool: AggregatedPlayer[] = [];
  let bestFemaleCount = -1;
  let bestScore = -Infinity;

  for (let femaleCount = minFemaleCount; femaleCount <= maxFemaleCount; femaleCount += 1) {
    const maleCount = TOTAL_STARTING_SLOTS - femaleCount;

    if (maleCount < lockedMales.length) {
      continue;
    }

    const unlockedFemaleNeeded = femaleCount - lockedFemales.length;
    const unlockedMaleNeeded = maleCount - lockedMales.length;

    if (unlockedFemaleNeeded > unlockedFemales.length || unlockedMaleNeeded > unlockedMales.length) {
      continue;
    }

    const candidate = [
      ...lockedPlayers,
      ...unlockedFemales.slice(0, unlockedFemaleNeeded),
      ...unlockedMales.slice(0, unlockedMaleNeeded),
    ].sort((left, right) => right.Score - left.Score);
    const candidateScore = sumScores(candidate);

    if (candidateScore > bestScore) {
      bestPool = candidate;
      bestFemaleCount = femaleCount;
      bestScore = candidateScore;
    }
  }

  return {
    bestPool,
    bestFemaleCount,
  };
}

function buildSelectionReasons(
  startingPool: AggregatedPlayer[],
  lockedNames: Set<string>,
  femaleQuotaCount: number,
) {
  const reasons = new Map<string, string>();
  const selectedFemales = startingPool
    .filter((player) => player.Gender === "Female" && !lockedNames.has(player.__name_norm))
    .sort((left, right) => right.Score - left.Score);
  const quotaFemaleNames = new Set(
    selectedFemales.slice(0, Math.max(femaleQuotaCount, 0)).map((player) => player.__name_norm),
  );

  startingPool.forEach((player) => {
    if (lockedNames.has(player.__name_norm)) {
      reasons.set(player.__name_norm, "Locked starter");
      return;
    }

    if (quotaFemaleNames.has(player.__name_norm)) {
      reasons.set(player.__name_norm, "Met female minimum");
      return;
    }

    reasons.set(player.__name_norm, "Best remaining score");
  });

  return reasons;
}


function generateLineup(players: AggregatedPlayer[], selections: Record<string, SelectionState>) {
  const available = players.filter((player) => selections[player.__name_norm]?.selected);
  const eligible = available.filter(
    (player) => player.Gender === "Male" || player.Gender === "Female",
  );

  if (eligible.length === 0) {
    return {
      availableRanked: [],
      starting: [],
      substitutes: [],
      warnings: ['No available players selected. Tick players in "Today\'s Availability" first.'],
    } satisfies GeneratedLineup;
  }

  const availableRanked = [...eligible].sort((left, right) => right.Score - left.Score);
  const lockedNames = new Set(
    availableRanked
      .filter((player) => selections[player.__name_norm]?.locked)
      .map((player) => player.__name_norm),
  );
  const lockedPlayers = availableRanked.filter((player) => lockedNames.has(player.__name_norm));
  const lockedFemales = lockedPlayers.filter((player) => player.Gender === "Female");
  const { bestPool: startingPool, bestFemaleCount } = pickBestStarterPool(availableRanked, lockedNames);
  const finalMales = startingPool.filter((player) => player.Gender === "Male");
  const finalFemales = startingPool.filter((player) => player.Gender === "Female");
  const startingRaw = chooseBestOrder(finalMales, finalFemales, TOTAL_STARTING_SLOTS);
  const selectionReasons = buildSelectionReasons(
    startingPool,
    lockedNames,
    Math.max(bestFemaleCount - lockedFemales.length, 0),
  );
  const starting = startingRaw.map((player, index) => ({
    ...player,
    position: index + 1,
    selectionType: lockedNames.has(player.__name_norm) ? "Locked" : "Ranked",
    selectionReason: selectionReasons.get(player.__name_norm) || "Best remaining score",
  })) satisfies ResultPlayer[];
  const startingNames = new Set(starting.map((player) => player.__name_norm));
  const subsRanked = availableRanked.filter((player) => !startingNames.has(player.__name_norm));
  const substitutes = alternateFromRanked(subsRanked).map((player, index) => ({
    ...player,
    position: index + 1,
    selectionType: lockedNames.has(player.__name_norm) ? "Locked" : "Ranked",
    selectionReason: "Bench ranking",
  })) satisfies ResultPlayer[];

  const warnings: string[] = [];
  const unknownGenderCount = available.filter((player) => player.Gender === "Unknown").length;

  if (finalFemales.length < MIN_FEMALE_STARTERS) {
    warnings.push(
      `Only ${finalFemales.length} female player(s) available for the minimum ${MIN_FEMALE_STARTERS} female starter requirement.`,
    );
  }

  if (lockedPlayers.length > TOTAL_STARTING_SLOTS) {
    warnings.push(
      `Locked starters (${lockedPlayers.length}) exceed total starting slots (${TOTAL_STARTING_SLOTS}).`,
    );
  }

  if (available.length !== eligible.length) {
    warnings.push(
      `${unknownGenderCount} selected player(s) have an unknown gender value and cannot be used in the alternating lineup.`,
    );
  }

  return {
    availableRanked,
    starting,
    substitutes,
    warnings,
  } satisfies GeneratedLineup;
}

function formatScore(score: number) {
  return score.toFixed(3);
}

function buildExportRows(result: GeneratedLineup) {
  return {
    availableRankings: result.availableRanked.map((player) => ({
      Player: player.Player,
      Gender: player.Gender,
      Score: formatScore(player.Score),
      MostRecentYear: player.MostRecentYear ?? "",
      YearsIncluded: player.YearsIncluded,
    })),
    starting10: result.starting.map((player) => ({
      Position: player.position,
      Player: player.Player,
      Gender: player.Gender,
      Score: formatScore(player.Score),
      MostRecentYear: player.MostRecentYear ?? "",
      YearsIncluded: player.YearsIncluded,
      SelectionType: player.selectionType,
      SelectionReason: player.selectionReason,
    })),
    substitutes: result.substitutes.map((player) => ({
      Position: player.position,
      Player: player.Player,
      Gender: player.Gender,
      Score: formatScore(player.Score),
      MostRecentYear: player.MostRecentYear ?? "",
      YearsIncluded: player.YearsIncluded,
      SelectionType: player.selectionType,
      SelectionReason: player.selectionReason,
    })),
    warnings: result.warnings.map((warning) => ({ Notes: warning })),
  };
}

function createPositionAssignments(lineup: GeneratedLineup) {
  const assignments: Record<string, LineupRole> = {};

  lineup.starting.forEach((player) => {
    assignments[player.__name_norm] = "";
  });

  lineup.substitutes.forEach((player) => {
    assignments[player.__name_norm] = "SUB";
  });

  return assignments;
}

function getAssignedPlayer(
  lineup: GeneratedLineup,
  assignments: Record<string, LineupRole>,
  position: FieldPositionCode,
) {
  return lineup.starting.find((player) => assignments[player.__name_norm] === position) || null;
}

function getLineupRoleCounts(lineup: GeneratedLineup, assignments: Record<string, LineupRole>) {
  const fieldCounts = FIELD_POSITIONS.map((position) => ({
    position,
    players: lineup.starting.filter((player) => assignments[player.__name_norm] === position),
  }));
  const missingPositions = fieldCounts
    .filter((entry) => entry.players.length === 0)
    .map((entry) => entry.position);
  const duplicatedPositions = fieldCounts
    .filter((entry) => entry.players.length > 1)
    .map((entry) => entry.position);
  const assignedFieldPlayers = lineup.starting.filter((player) =>
    FIELD_POSITIONS.includes(assignments[player.__name_norm] as FieldPositionCode),
  ).length;
  const ehPlayers = [...lineup.starting, ...lineup.substitutes].filter(
    (player) => assignments[player.__name_norm] === "EH",
  );
  const subPlayers = [...lineup.starting, ...lineup.substitutes].filter(
    (player) => assignments[player.__name_norm] === "SUB",
  );

  return {
    assignedFieldPlayers,
    missingPositions,
    duplicatedPositions,
    ehPlayers,
    subPlayers,
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortName(value: string) {
  const parts = value.trim().split(/\s+/);

  if (parts.length <= 1) {
    return value;
  }

  const first = parts[0];
  const last = parts[parts.length - 1];
  const shortened = `${first.slice(0, 1)}. ${last}`;

  return shortened.length > 13 ? `${first.slice(0, 1)}. ${last.slice(0, 9)}.` : shortened;
}

function lineupNumberForPlayer(lineup: GeneratedLineup, nameNorm: string) {
  const starter = lineup.starting.find((player) => player.__name_norm === nameNorm);

  if (starter) {
    return String(starter.position);
  }

  return "S";
}

function svgJersey(x: number, y: number, label: string, playerName: string) {
  return `
    <g transform="translate(${x - 4.2} ${y - 4.5})">
      <path d="M1.3 1.6 L3.3 0.7 L4.2 1.2 L5.1 0.7 L7.1 1.6 L8.2 4.2 L6.6 4.9 L5.9 3.8 L5.9 9.6 L2.5 9.6 L2.5 3.8 L1.8 4.9 L0.2 4.2 Z" fill="#9cc8e2" stroke="#061321" stroke-width="0.45" />
      <text x="4.2" y="6.4" text-anchor="middle" font-size="2.8" font-weight="900" fill="#061321">${escapeXml(label)}</text>
    </g>
    <text x="${x}" y="${y + 8.6}" text-anchor="middle" font-size="3.15" font-weight="900" fill="#020913" stroke="#dcefcf" stroke-width="0.55" paint-order="stroke">${escapeXml(shortName(playerName))}</text>`;
}

function buildDiamondSvg(lineup: GeneratedLineup, assignments: Record<string, LineupRole>) {
  const markers = FIELD_POSITIONS.map((position) => {
    const coords = DIAMOND_POSITIONS[position];
    const player = getAssignedPlayer(lineup, assignments, position);
    const label = player ? lineupNumberForPlayer(lineup, player.__name_norm) : position;

    return player
      ? svgJersey(coords.x, coords.y, label, player.Player)
      : `<text x="${coords.x}" y="${coords.y}" text-anchor="middle" font-size="3.2" font-weight="900" fill="#020913">${position}</text>`;
  }).join("");
  const ehPlayers = [...lineup.starting, ...lineup.substitutes]
    .filter((player) => assignments[player.__name_norm] === "EH")
    .map((player) => player.Player);
  const subPlayers = [...lineup.starting, ...lineup.substitutes]
    .filter((player) => assignments[player.__name_norm] === "SUB")
    .map((player) => player.Player);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 100 150">
  <rect width="100" height="150" fill="#00a713"/>
  <rect width="100" height="10" fill="#b69b62"/>
  <text x="50" y="6.5" text-anchor="middle" font-size="4.8" font-weight="900" fill="#ffffff">Barracudas</text>
  <path d="M50 117 L20 88 L50 62 L80 88 Z" fill="#c29660" />
  <path d="M50 106 L29 88 L50 70 L71 88 Z" fill="#00a713" />
  <path d="M21 88 L27 94 M79 88 L73 94 M50 117 L50 124" stroke="#f6ead1" stroke-width="0.9" opacity="0.9"/>
  <path d="M0 72 L27 103 M100 72 L73 103" stroke="#dcefcf" stroke-width="0.8" opacity="0.8"/>
  <circle cx="50" cy="64" r="1.4" fill="#ffffff"/>
  <rect x="26.8" y="97.7" width="2.2" height="2.2" transform="rotate(45 27.9 98.8)" fill="#ffffff"/>
  <rect x="71" y="97.7" width="2.2" height="2.2" transform="rotate(45 72.1 98.8)" fill="#ffffff"/>
  <rect x="46.7" y="128.2" width="6.6" height="6.2" rx="0.8" fill="#f8f4e9"/>
  <path d="M47.4 134.4 L47.4 128.7 M52.6 134.4 L52.6 128.7" stroke="#b69b62" stroke-width="0.7"/>
  ${markers}
  <g transform="translate(5 142)">
    <text x="0" y="0" font-size="2.6" font-weight="900" fill="#020913">EH</text>
    <text x="6" y="0" font-size="2.6" font-weight="800" fill="#020913">${escapeXml(ehPlayers.map(shortName).join(", ") || "None")}</text>
    <text x="0" y="4" font-size="2.6" font-weight="900" fill="#020913">Subs</text>
    <text x="8" y="4" font-size="2.6" font-weight="800" fill="#020913">${escapeXml(subPlayers.map(shortName).join(", ") || "None")}</text>
  </g>
</svg>`;
}

function downloadCsvFile(filename: string, rows: Record<string, unknown>[]) {
  const csv = serializeCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsvExports(result: GeneratedLineup) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const exports = buildExportRows(result);

  downloadCsvFile(`barracudas-starting-10-${dateStamp}.csv`, exports.starting10);
  downloadCsvFile(`barracudas-substitutes-${dateStamp}.csv`, exports.substitutes);
  downloadCsvFile(`barracudas-available-rankings-${dateStamp}.csv`, exports.availableRankings);

  if (exports.warnings.length > 0) {
    downloadCsvFile(`barracudas-warnings-${dateStamp}.csv`, exports.warnings);
  }
}

function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfText(
  x: number,
  y: number,
  text: string,
  size = 11,
  bold = false,
  color = "0.863 0.898 0.949",
) {
  return `${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(text)}) Tj ET\n`;
}

function pdfRect(x: number, y: number, width: number, height: number, fill: string) {
  return `${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
}

function pdfPath(path: string, fill: string) {
  return `${fill} rg ${path} f\n`;
}

function pdfStroke(path: string, color: string, width = 1) {
  return `${color} RG ${width} w ${path} S\n`;
}

function pdfJersey(x: number, y: number, label: string, playerName: string) {
  return [
    pdfPath(
      `${x - 15} ${y + 21} m ${x - 4} ${y + 26} l ${x} ${y + 23} l ${x + 4} ${y + 26} l ${x + 15} ${y + 21} l ${x + 20} ${y + 7} l ${x + 11} ${y + 3} l ${x + 8} ${y + 9} l ${x + 8} ${y - 22} l ${x - 8} ${y - 22} l ${x - 8} ${y + 9} l ${x - 11} ${y + 3} l ${x - 20} ${y + 7} l h`,
      "0.620 0.784 0.886",
    ),
    pdfStroke(
      `${x - 15} ${y + 21} m ${x - 4} ${y + 26} l ${x} ${y + 23} l ${x + 4} ${y + 26} l ${x + 15} ${y + 21} l ${x + 20} ${y + 7} l ${x + 11} ${y + 3} l ${x + 8} ${y + 9} l ${x + 8} ${y - 22} l ${x - 8} ${y - 22} l ${x - 8} ${y + 9} l ${x - 11} ${y + 3} l ${x - 20} ${y + 7} l h`,
      "0.024 0.075 0.129",
      1.2,
    ),
    pdfText(x - 5, y - 3, label, 13, true, "0.012 0.067 0.114"),
    pdfText(x - 24, y - 38, shortName(playerName), 12, true, "0 0 0"),
  ].join("");
}

function buildPositionPdf(lineup: GeneratedLineup, assignments: Record<string, LineupRole>) {
  const pageWidth = 612;
  const pageHeight = 792;
  const x = (percent: number) => (percent / 100) * pageWidth;
  const y = (percent: number) => pageHeight - (percent / 150) * pageHeight;
  const ehPlayers = [...lineup.starting, ...lineup.substitutes]
    .filter((player) => assignments[player.__name_norm] === "EH")
    .map((player) => shortName(player.Player));
  const subPlayers = [...lineup.starting, ...lineup.substitutes]
    .filter((player) => assignments[player.__name_norm] === "SUB")
    .map((player) => shortName(player.Player));
  const markerContent = FIELD_POSITIONS.map((position) => {
    const coords = DIAMOND_POSITIONS[position];
    const player = getAssignedPlayer(lineup, assignments, position);

    if (!player) {
      return pdfText(x(coords.x) - 8, y(coords.y), position, 10, true, "0 0 0");
    }

    return pdfJersey(x(coords.x), y(coords.y), lineupNumberForPlayer(lineup, player.__name_norm), player.Player);
  }).join("");
  const content = [
    pdfRect(0, 0, pageWidth, pageHeight, "0 0.655 0.075"),
    pdfRect(0, 720, pageWidth, 72, "0.714 0.608 0.384"),
    pdfText(222, 750, "Barracudas", 30, true, "1 1 1"),
    pdfPath("306 174 m 122 327 l 306 465 l 490 327 l h", "0.761 0.588 0.376"),
    pdfPath("306 232 m 178 327 l 306 422 l 434 327 l h", "0 0.655 0.075"),
    pdfStroke("0 411 m 165 248 M612 411 m447 248", "0.863 0.929 0.812", 4),
    pdfStroke("306 174 m 122 327 l 306 465 l 490 327 l 306 174 l", "0.965 0.918 0.773", 3),
    pdfRect(286, 79, 40, 34, "0.973 0.957 0.914"),
    pdfStroke("291 84 m291 111 M321 84 m321 111", "0.714 0.608 0.384", 2),
    markerContent,
    pdfText(28, 38, "EH", 13, true, "0 0 0"),
    pdfText(62, 38, ehPlayers.join(", ") || "None", 11, true, "0 0 0"),
    pdfText(28, 20, "Subs", 13, true, "0 0 0"),
    pdfText(72, 20, subPlayers.join(", ") || "None", 11, true, "0 0 0"),
  ].join("");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadPositionExports(lineup: GeneratedLineup, assignments: Record<string, LineupRole>) {
  const dateStamp = new Date().toISOString().slice(0, 10);

  downloadBlobFile(`barracudas-positioned-lineup-${dateStamp}.pdf`, buildPositionPdf(lineup, assignments));
}

function countByGender(players: AggregatedPlayer[], selections: Record<string, SelectionState>) {
  return players.reduce(
    (counts, player) => {
      const selection = selections[player.__name_norm];

      if (!selection?.selected) {
        return counts;
      }

      if (player.Gender === "Male") {
        counts.males += 1;
      } else if (player.Gender === "Female") {
        counts.females += 1;
      } else {
        counts.unknown += 1;
      }

      return counts;
    },
    { males: 0, females: 0, unknown: 0 },
  );
}

function buildSelectionValidation(
  players: AggregatedPlayer[],
  selections: Record<string, SelectionState>,
) {
  const selectedPlayers = players.filter((player) => selections[player.__name_norm]?.selected);
  const lockedPlayers = selectedPlayers.filter((player) => selections[player.__name_norm]?.locked);
  const counts = countByGender(players, selections);
  const blocking: string[] = [];
  const advisory: string[] = [];

  if (selectedPlayers.length < TOTAL_STARTING_SLOTS) {
    blocking.push(
      `You selected ${selectedPlayers.length} players. At least ${TOTAL_STARTING_SLOTS} are needed for a starting lineup.`,
    );
  }

  if (counts.females < MIN_FEMALE_STARTERS) {
    blocking.push(
      `You selected only ${counts.females} female players. At least ${MIN_FEMALE_STARTERS} are required.`,
    );
  }

  if (lockedPlayers.length > TOTAL_STARTING_SLOTS) {
    blocking.push(
      `You locked ${lockedPlayers.length} players. Only ${TOTAL_STARTING_SLOTS} starting slots are available.`,
    );
  }

  if (counts.unknown > 0) {
    advisory.push(
      `${counts.unknown} selected player(s) have unknown gender and will not count toward the required male/female slots.`,
    );
  }

  if (selectedPlayers.length === TOTAL_STARTING_SLOTS) {
    advisory.push("You have no bench selected. Add more players if you want substitute recommendations.");
  }

  return {
    blocking,
    advisory,
  } satisfies ValidationState;
}

function buildBenchStrategy(lineup: GeneratedLineup): BenchStrategy {
  const startingNames = new Set(lineup.starting.map((player) => player.__name_norm));
  const benchPool = lineup.availableRanked.filter((player) => !startingNames.has(player.__name_norm));

  return {
    nextBestMale: benchPool.find((player) => player.Gender === "Male") || null,
    nextBestFemale: benchPool.find((player) => player.Gender === "Female") || null,
    benchCore: benchPool.slice(0, 3),
  };
}

function createSelectionMap(players: AggregatedPlayer[], current: Record<string, SelectionState> = {}) {
  const next = { ...current };

  players.forEach((player) => {
    next[player.__name_norm] = next[player.__name_norm] || {
      selected: false,
      locked: false,
    };
  });

  return next;
}

function badgeClassName(selectionType: ResultPlayer["selectionType"]) {
  return selectionType === "Locked"
    ? "border-[rgba(24,213,141,0.22)] bg-[rgba(11,96,67,0.24)] text-[color:var(--success)]"
    : "border-[rgba(29,215,207,0.18)] bg-[rgba(7,63,82,0.24)] text-[color:var(--accent)]";
}

function statusTone(kind: "danger" | "warning" | "success") {
  if (kind === "danger") {
    return "border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] text-[color:var(--danger)]";
  }

  if (kind === "warning") {
    return "border-[rgba(233,185,62,0.2)] bg-[rgba(94,68,16,0.18)] text-[color:var(--warning)]";
  }

  return "border-[rgba(24,213,141,0.24)] bg-[rgba(22,135,91,0.18)] text-[color:var(--success)]";
}

export function BarracudasDashboard({
  initialPlayers,
  initialError,
}: {
  initialPlayers: AggregatedPlayer[];
  initialError: string;
}) {
  const [players, setPlayers] = useState<AggregatedPlayer[]>(initialPlayers);
  const [manualPlayers, setManualPlayers] = useState<AggregatedPlayer[]>([]);
  const [selections, setSelections] = useState<Record<string, SelectionState>>(
    createSelectionMap(initialPlayers),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [search, setSearch] = useState("");
  const [lineup, setLineup] = useState<GeneratedLineup | null>(null);
  const [positionAssignments, setPositionAssignments] = useState<Record<string, LineupRole>>({});
  const [manualName, setManualName] = useState("");
  const [manualGender, setManualGender] = useState<"Male" | "Female">("Male");
  const [manualLock, setManualLock] = useState(false);
  const [manualError, setManualError] = useState("");
  const [guestPool, setGuestPool] = useState<AggregatedPlayer[]>([]);
  const [guestLoading, setGuestLoading] = useState(true);
  const [guestSelection, setGuestSelection] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [lineupHistory, setLineupHistory] = useState<LineupHistoryItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem("barracudas-lineup-history");
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as LineupHistoryItem[];
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  });

  const allPlayers = useMemo(
    () =>
      [...players, ...manualPlayers].sort((left, right) =>
        left.Player.localeCompare(right.Player),
      ),
    [manualPlayers, players],
  );
  const filteredPlayers = useMemo(() => {
    const query = normName(search);
    if (!query) {
      return allPlayers;
    }

    return allPlayers.filter((player) => player.__name_norm.includes(query));
  }, [allPlayers, search]);
  const selectedCounts = useMemo(
    () => countByGender(allPlayers, selections),
    [allPlayers, selections],
  );
  const lockedCount = useMemo(
    () =>
      Object.values(selections).filter((selection) => selection.selected && selection.locked)
        .length,
    [selections],
  );
  const selectionValidation = useMemo(
    () => buildSelectionValidation(allPlayers, selections),
    [allPlayers, selections],
  );
  const benchStrategy = useMemo(
    () => (lineup ? buildBenchStrategy(lineup) : null),
    [lineup],
  );
  const positionSummary = useMemo(
    () => (lineup ? getLineupRoleCounts(lineup, positionAssignments) : null),
    [lineup, positionAssignments],
  );

  useEffect(() => {
    let frame = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      frame += 1;

      if (frame <= MARC_MESSAGE.length) {
        setTypedMessage(MARC_MESSAGE.slice(0, frame));
        timeoutId = setTimeout(tick, 65);
        return;
      }

      timeoutId = setTimeout(() => {
        frame = 0;
        setTypedMessage("");
        tick();
      }, 1800);
    };

    tick();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "barracudas-lineup-history",
      JSON.stringify(lineupHistory.slice(0, 3)),
    );
  }, [lineupHistory]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/admin/api/barracudas/pool", { cache: "no-store" });
        const payload = (await response.json()) as { players?: AggregatedPlayer[] };

        if (!cancelled && response.ok && Array.isArray(payload.players)) {
          setGuestPool(payload.players);
        }
      } catch {
        // Guest additions stay unavailable; the free-text fallback still works.
      } finally {
        if (!cancelled) {
          setGuestLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const guestOptions = useMemo(() => {
    const existingNames = new Set(allPlayers.map((player) => player.__name_norm));
    return guestPool.filter((player) => !existingNames.has(player.__name_norm));
  }, [allPlayers, guestPool]);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/admin/api/barracudas", {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | { players: AggregatedPlayer[] }
        | { error?: string };

      if (!response.ok || !("players" in payload)) {
        throw new Error(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Unable to load players from the Barracudas API.",
        );
      }

      const loadedPlayers = payload.players;
      setPlayers(loadedPlayers);
      setSelections((current) => createSelectionMap(loadedPlayers, current));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load players from the Barracudas API.",
      );
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function updateSelection(nameNorm: string, patch: Partial<SelectionState>) {
    setSelections((current) => {
      const existing = current[nameNorm] || { selected: false, locked: false };
      const next = {
        ...existing,
        ...patch,
      };

      if (!next.selected) {
        next.locked = false;
      }

      return {
        ...current,
        [nameNorm]: next,
      };
    });
  }

  function handleAddGuestPlayer() {
    const guest = guestOptions.find((player) => player.__name_norm === guestSelection);

    if (!guest) {
      setManualError("Choose a player from the database list first.");
      return;
    }

    // One-time guest: lives in component state only, never persisted, so the
    // next lineup build starts from the regular Barracudas pool again.
    setManualPlayers((current) => [...current, { ...guest, isManual: true }]);
    setSelections((current) => ({
      ...current,
      [guest.__name_norm]: {
        selected: true,
        locked: manualLock,
      },
    }));
    setGuestSelection("");
    setManualError("");
  }

  function handleAddManualPlayer() {
    const trimmedName = manualName.trim();
    const normalizedName = normName(trimmedName);

    if (!trimmedName) {
      setManualError("Enter a player name before adding a manual player.");
      return;
    }

    if (allPlayers.some((player) => player.__name_norm === normalizedName)) {
      setManualError("That player already exists in the current Barracudas pool.");
      return;
    }

    const player: AggregatedPlayer = {
      Player: trimmedName,
      Gender: manualGender,
      Score: 0,
      MostRecentYear: null,
      YearsIncluded: "Manual",
      __name_norm: normalizedName,
      isManual: true,
    };

    setManualPlayers((current) => [...current, player]);
    setSelections((current) => ({
      ...current,
      [normalizedName]: {
        selected: true,
        locked: manualLock,
      },
    }));
    setManualName("");
    setManualGender("Male");
    setManualLock(false);
    setManualError("");
  }

  function handleGenerate() {
    if (selectionValidation.blocking.length > 0) {
      setLineup(null);
      setPositionAssignments({});
      return;
    }

    const nextLineup = generateLineup(allPlayers, selections);
    setLineup(nextLineup);
    setPositionAssignments(createPositionAssignments(nextLineup));
    setLineupHistory((current) =>
      [
        {
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
          lineup: nextLineup,
        },
        ...current,
      ].slice(0, 3),
    );
  }

  return (
    <div className="grid gap-6">
      <section className="admin-panel rounded-[2rem] overflow-hidden border border-[color:var(--border)]">
        <div className="border-b border-[rgba(115,145,176,0.1)] bg-[linear-gradient(90deg,rgba(8,27,45,0.94),rgba(6,20,35,0.9))] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[rgba(239,75,95,0.82)]" />
            <span className="h-3 w-3 rounded-full bg-[rgba(233,185,62,0.82)]" />
            <span className="h-3 w-3 rounded-full bg-[rgba(24,213,141,0.82)]" />
            <span className="ml-3 text-xs uppercase tracking-[0.2em] text-[#8ea0b4]">
              Barracudas Terminal
            </span>
          </div>
        </div>
        <div className="bg-[linear-gradient(180deg,rgba(2,14,24,0.92),rgba(3,11,21,0.96))] px-5 py-6 sm:px-6">
          <p className="font-mono text-sm text-[color:var(--accent)] sm:text-base">
            <span className="mr-3 text-[#5e7f9c]">&gt;</span>
            {typedMessage}
            <span className="ml-1 inline-block h-[1.1em] w-[0.6ch] animate-pulse bg-[color:var(--accent)] align-[-0.2em]" />
          </p>
        </div>
      </section>

      <SectionCard
        title="Barracudas Lineup Builder"
        subtitle="Client-side lineup generator using Neon player stats and the same weighted scoring rules as the original Python tool."
        icon={Users}
        iconClassName="text-[color:var(--accent)]"
      >
        <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <article className="admin-panel-soft rounded-[1.5rem] px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-white">
                  Neon Source
                </h3>
                <p className="mt-2 max-w-3xl text-sm text-[color:var(--muted-foreground)]">
                  Reads generated current-season stats and archived historical totals from Neon, computes a recency-weighted OPS score, then generates the Barracudas starting 10 and substitutes entirely in the browser.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadPlayers();
                }}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loading ? "Refreshing..." : "Refresh Players"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Players Loaded</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                  {players.length}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Selected</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                  {selectedCounts.males}M / {selectedCounts.females}F
                </div>
                {selectedCounts.unknown > 0 ? (
                  <p className="mt-2 text-xs text-[color:var(--warning)]">
                    {selectedCounts.unknown} unknown gender
                  </p>
                ) : null}
              </div>
              <div className="rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Locked Starters</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                  {lockedCount}
                </div>
              </div>
            </div>

            {error ? (
              <div className={`mt-5 rounded-[1.2rem] border px-4 py-3 text-sm ${statusTone("danger")}`}>
                {error}
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4 text-sm text-[color:var(--muted-foreground)]">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                <div>
                  <p className="font-medium text-white">Neon tables used for scoring</p>
                  <p className="mt-2">
                    {REQUIRED_COLUMNS.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="admin-panel-soft rounded-[1.5rem] px-5 py-5">
            <h3 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-white">
              Lineup Rules
            </h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1.15rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                OPS scoring prefers <span className="text-white">OPS</span>, then <span className="text-white">OBP + SLG</span>, then <span className="text-white">Hits / Total AB</span>.
              </div>
              <div className="rounded-[1.15rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                Recency weighting uses <span className="text-white">1.0</span> for the latest year, <span className="text-white">0.6</span> for the previous year, and <span className="text-white">0.3</span> for older seasons.
              </div>
              <div className="rounded-[1.15rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                Starting 10 targets <span className="text-white">10 players with at least 4 females</span> in alternating order until one gender runs out.
              </div>
              <div className="rounded-[1.15rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                Locked players fill slots first. Remaining starters and substitutes are chosen by weighted score.
              </div>
            </div>
          </article>
        </div>
      </SectionCard>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionCard
          title="Today's Availability"
          subtitle="Tick available players, optionally lock them into the starting 10, and add any new player who is not yet in Neon."
          icon={CheckCircle2}
          iconClassName="text-[color:var(--accent)]"
        >
          <div className="mt-7 grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#d8dfeb]">Search players</span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by player name"
                  className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={selectionValidation.blocking.length > 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Lineup
                </button>
              </div>
            </div>

            {selectionValidation.blocking.length > 0 || selectionValidation.advisory.length > 0 ? (
              <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
                  <h3 className="text-sm font-semibold tracking-[-0.03em] text-white">
                    Pre-Generation Validation
                  </h3>
                </div>
                <div className="space-y-3">
                  {selectionValidation.blocking.map((message) => (
                    <div
                      key={message}
                      className={`rounded-[1.1rem] border px-4 py-3 text-sm ${statusTone("danger")}`}
                    >
                      {message}
                    </div>
                  ))}
                  {selectionValidation.advisory.map((message) => (
                    <div
                      key={message}
                      className={`rounded-[1.1rem] border px-4 py-3 text-sm ${statusTone("warning")}`}
                    >
                      {message}
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Available Players</p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      Score and most recent year are shown beside each player.
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">
                    {filteredPlayers.length} shown
                  </p>
                </div>

                <div className="admin-scrollbar max-h-[38rem] space-y-3 overflow-y-auto pr-1">
                  {filteredPlayers.map((player) => {
                    const selection = selections[player.__name_norm] || {
                      selected: false,
                      locked: false,
                    };

                    return (
                      <label
                        key={player.__name_norm}
                        className={[
                          "flex flex-col gap-3 rounded-[1.2rem] border px-4 py-4",
                          selection.selected
                            ? "border-[rgba(29,215,207,0.2)] bg-[rgba(7,63,82,0.2)]"
                            : "border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-white">
                                {player.Player}
                              </span>
                              <span className="rounded-full border border-[rgba(115,145,176,0.12)] px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[#9bb0c6]">
                                {player.Gender}
                              </span>
                              {player.isManual ? (
                                <span className="rounded-full border border-[rgba(233,185,62,0.2)] bg-[rgba(94,68,16,0.18)] px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[color:var(--warning)]">
                                  Manual
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                              OPS score {formatScore(player.Score)} | Most recent {player.MostRecentYear ?? "-"} | Years {player.YearsIncluded}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={selection.selected}
                            onChange={(event) =>
                              updateSelection(player.__name_norm, {
                                selected: event.target.checked,
                              })
                            }
                            className="mt-1 h-5 w-5 rounded border-[rgba(115,145,176,0.24)] bg-transparent"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-[rgba(115,145,176,0.08)] pt-3">
                          <span className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">
                            Lock into starting 10
                          </span>
                          <button
                            type="button"
                            disabled={!selection.selected}
                            onClick={() =>
                              updateSelection(player.__name_norm, {
                                locked: !selection.locked,
                              })
                            }
                            className={[
                              "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium",
                              selection.locked
                                ? "border-[rgba(24,213,141,0.22)] bg-[rgba(11,96,67,0.24)] text-[color:var(--success)]"
                                : "border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.72)] text-[#bfc9d7]",
                              !selection.selected ? "cursor-not-allowed opacity-50" : "hover:border-[color:var(--border-strong)]",
                            ].join(" ")}
                          >
                            {selection.locked ? "Locked" : "Not locked"}
                          </button>
                        </div>
                      </label>
                    );
                  })}

                  {!loading && filteredPlayers.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-6 text-sm text-[color:var(--muted-foreground)]">
                      No players match the current search.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4">
                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <UserPlus className="h-4 w-4 text-[color:var(--accent)]" />
                    <h3 className="text-sm font-semibold tracking-[-0.03em]">
                      Add Manual Player
                    </h3>
                  </div>

                  <div className="mt-4 space-y-4">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#d8dfeb]">From player database</span>
                      <select
                        value={guestSelection}
                        onChange={(event) => setGuestSelection(event.target.value)}
                        disabled={guestLoading}
                        className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none disabled:opacity-60"
                      >
                        <option value="">
                          {guestLoading ? "Loading player database..." : "Choose a player"}
                        </option>
                        {guestOptions.map((player) => (
                          <option key={player.__name_norm} value={player.__name_norm}>
                            {player.Player} — {player.Gender}
                            {player.YearsIncluded === "No stats"
                              ? " (no stats)"
                              : ` · ${player.Score.toFixed(3)}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddGuestPlayer}
                      disabled={guestLoading || !guestSelection}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add From Database
                    </button>

                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      One-time guest for this lineup only — added with their club-wide score, but
                      not saved to the Barracudas pool for future lineups.
                    </p>

                    <div className="border-t border-[rgba(115,145,176,0.1)] pt-4">
                      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">
                        Or add a name manually
                      </p>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#d8dfeb]">Player name</span>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(event) => setManualName(event.target.value)}
                        placeholder="New player name"
                        className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[#d8dfeb]">Gender</span>
                      <select
                        value={manualGender}
                        onChange={(event) => setManualGender(event.target.value as "Male" | "Female")}
                        className="w-full rounded-xl border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.82)] px-3 py-3 text-sm text-white outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-3 py-3 text-sm text-[#d8dfeb]">
                      <span>Lock into starting 10 immediately</span>
                      <input
                        type="checkbox"
                        checked={manualLock}
                        onChange={(event) => setManualLock(event.target.checked)}
                        className="h-5 w-5 rounded border-[rgba(115,145,176,0.24)] bg-transparent"
                      />
                    </label>

                    {manualError ? (
                      <div className={`rounded-[1.1rem] border px-4 py-3 text-sm ${statusTone("danger")}`}>
                        {manualError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleAddManualPlayer}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] hover:opacity-90"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add To Availability
                    </button>
                  </div>
                </article>

                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <h3 className="text-sm font-semibold tracking-[-0.03em] text-white">
                    Match Summary
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-[color:var(--muted-foreground)]">
                    <p>
                      Starting lineup target: <span className="text-white">10 players / minimum 4 female</span>
                    </p>
                    <p>
                      Alternating order: <span className="text-white">M/F/M/F</span>
                    </p>
                    <p>
                      Total selected today: <span className="text-white">{selectedCounts.males + selectedCounts.females + selectedCounts.unknown}</span>
                    </p>
                    <p>
                      Locked today: <span className="text-white">{lockedCount}</span>
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Generated Lineup"
          subtitle="Starting 10, substitutes, and warnings generated from the selected Barracudas availability list."
          icon={Sparkles}
          iconClassName="text-[color:var(--accent)]"
        >
          <div className="mt-7 grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Export downloads separate CSV files for <span className="text-white">Starting 10</span>, <span className="text-white">Substitutes</span>, <span className="text-white">Available Rankings</span>, and <span className="text-white">Warnings</span>.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!lineup}
                  onClick={() => {
                    setLineup(null);
                    setPositionAssignments({});
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[rgba(239,75,95,0.24)] bg-[rgba(125,22,38,0.18)] px-5 text-sm font-semibold text-[color:var(--danger)] hover:bg-[rgba(125,22,38,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete Lineup
                </button>

                <button
                  type="button"
                  disabled={!lineup}
                  onClick={() => {
                    if (lineup) {
                      downloadCsvExports(lineup);
                    }
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[rgba(29,215,207,0.14)] px-5 text-sm font-semibold text-[color:var(--accent)] hover:bg-[rgba(29,215,207,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>

                <button
                  type="button"
                  disabled={!lineup}
                  onClick={() => {
                    if (lineup) {
                      downloadPositionExports(lineup, positionAssignments);
                    }
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-[#02111d] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export Positioned
                </button>
              </div>
            </div>

            {lineup ? (
              <>
                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                      Starting 10
                    </h3>
                    <span className="rounded-full border border-[rgba(115,145,176,0.12)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#9bb0c6]">
                      {lineup.starting.length} players
                    </span>
                  </div>

                  <div className="admin-scrollbar overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">
                        <tr>
                          <th className="px-3 py-2">Pos</th>
                          <th className="px-3 py-2">Player</th>
                          <th className="px-3 py-2">Gender</th>
                          <th className="px-3 py-2">Score</th>
                          <th className="px-3 py-2">Years</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineup.starting.map((player) => (
                          <tr
                            key={`${player.__name_norm}-${player.position}`}
                            className="border-t border-[rgba(115,145,176,0.08)] text-[#dce5f1]"
                          >
                            <td className="px-3 py-3">{player.position}</td>
                            <td className="px-3 py-3 font-medium text-white">{player.Player}</td>
                            <td className="px-3 py-3">{player.Gender}</td>
                            <td className="px-3 py-3">{formatScore(player.Score)}</td>
                            <td className="px-3 py-3">{player.YearsIncluded}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClassName(player.selectionType)}`}
                              >
                                {player.selectionType}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-[color:var(--muted-foreground)]">
                              {player.selectionReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                        Assign Positions
                      </h3>
                      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                        Keep the generated batting order, then assign fielding roles, EH, and subs.
                      </p>
                    </div>
                    {positionSummary ? (
                      <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[360px]">
                        <div className="rounded-lg border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.66)] px-3 py-2">
                          <div className="text-lg font-semibold text-white">
                            {positionSummary.assignedFieldPlayers}/10
                          </div>
                          <div className="text-[#93a0b3]">Field</div>
                        </div>
                        <div className="rounded-lg border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.66)] px-3 py-2">
                          <div className="text-lg font-semibold text-white">{positionSummary.ehPlayers.length}</div>
                          <div className="text-[#93a0b3]">EH</div>
                        </div>
                        <div className="rounded-lg border border-[rgba(115,145,176,0.12)] bg-[rgba(3,11,21,0.66)] px-3 py-2">
                          <div className="text-lg font-semibold text-white">{positionSummary.subPlayers.length}</div>
                          <div className="text-[#93a0b3]">Subs</div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {positionSummary?.missingPositions.length || positionSummary?.duplicatedPositions.length ? (
                    <div className="mb-4 grid gap-2 text-sm md:grid-cols-2">
                      {positionSummary.missingPositions.length > 0 ? (
                        <div className={`rounded-[1.1rem] border px-4 py-3 ${statusTone("warning")}`}>
                          Missing: {positionSummary.missingPositions.join(", ")}
                        </div>
                      ) : null}
                      {positionSummary.duplicatedPositions.length > 0 ? (
                        <div className={`rounded-[1.1rem] border px-4 py-3 ${statusTone("danger")}`}>
                          Duplicated: {positionSummary.duplicatedPositions.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={`mb-4 rounded-[1.1rem] border px-4 py-3 text-sm ${statusTone("success")}`}>
                      All fielding positions have one assigned starter.
                    </div>
                  )}

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                    <div className="admin-scrollbar overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">
                          <tr>
                            <th className="px-3 py-2">Bat</th>
                            <th className="px-3 py-2">Player</th>
                            <th className="px-3 py-2">Role</th>
                            <th className="px-3 py-2">Group</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...lineup.starting, ...lineup.substitutes].map((player) => {
                            const isStarter = lineup.starting.some(
                              (starter) => starter.__name_norm === player.__name_norm,
                            );

                            return (
                              <tr
                                key={`role-${player.__name_norm}`}
                                className="border-t border-[rgba(115,145,176,0.08)] text-[#dce5f1]"
                              >
                                <td className="px-3 py-3">{isStarter ? player.position : "-"}</td>
                                <td className="px-3 py-3 font-medium text-white">{player.Player}</td>
                                <td className="px-3 py-3">
                                  <select
                                    value={positionAssignments[player.__name_norm] || ""}
                                    onChange={(event) =>
                                      setPositionAssignments((current) => ({
                                        ...current,
                                        [player.__name_norm]: event.target.value as LineupRole,
                                      }))
                                    }
                                    className="h-10 min-w-[8rem] rounded-lg border border-[color:var(--border)] bg-[#071525] px-3 text-sm text-white outline-none focus:border-[color:var(--accent)]"
                                  >
                                    {LINEUP_ROLES.map((role) => (
                                      <option key={role.value || "blank"} value={role.value}>
                                        {role.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-3 text-[color:var(--muted-foreground)]">
                                  {isStarter ? "Generated starter" : "Generated substitute"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[#061321]/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-white">Diamond Preview</h4>
                        <span className="text-xs text-[#93a0b3]">Export as PDF</span>
                      </div>
                      <div
                        className="overflow-hidden rounded-xl border border-[rgba(115,145,176,0.12)] [&_svg]:h-auto [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: buildDiamondSvg(lineup, positionAssignments) }}
                      />
                    </div>
                  </div>
                </article>

                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                      Substitutes
                    </h3>
                    <span className="rounded-full border border-[rgba(115,145,176,0.12)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#9bb0c6]">
                      {lineup.substitutes.length} players
                    </span>
                  </div>

                  <div className="admin-scrollbar overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">
                        <tr>
                          <th className="px-3 py-2">Pos</th>
                          <th className="px-3 py-2">Player</th>
                          <th className="px-3 py-2">Gender</th>
                          <th className="px-3 py-2">Score</th>
                          <th className="px-3 py-2">Years</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineup.substitutes.map((player) => (
                          <tr
                            key={`${player.__name_norm}-${player.position}`}
                            className="border-t border-[rgba(115,145,176,0.08)] text-[#dce5f1]"
                          >
                            <td className="px-3 py-3">{player.position}</td>
                            <td className="px-3 py-3 font-medium text-white">{player.Player}</td>
                            <td className="px-3 py-3">{player.Gender}</td>
                            <td className="px-3 py-3">{formatScore(player.Score)}</td>
                            <td className="px-3 py-3">{player.YearsIncluded}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClassName(player.selectionType)}`}
                              >
                                {player.selectionType}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-[color:var(--muted-foreground)]">
                              {player.selectionReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                      Warnings
                    </h3>
                  </div>

                  {lineup.warnings.length > 0 ? (
                    <div className="space-y-3">
                      {lineup.warnings.map((warning) => (
                        <div
                          key={warning}
                          className={`rounded-[1.1rem] border px-4 py-3 text-sm ${statusTone("warning")}`}
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`rounded-[1.1rem] border px-4 py-3 text-sm ${statusTone("success")}`}>
                      No lineup warnings for the current Barracudas selection.
                    </div>
                  )}
                </article>

                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                      Bench Strategy
                    </h3>
                    <span className="rounded-full border border-[rgba(115,145,176,0.12)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#9bb0c6]">
                      Next up
                    </span>
                  </div>

                  {benchStrategy ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4">
                          <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Next Male</div>
                          <div className="mt-2 text-sm font-semibold text-white">
                            {benchStrategy.nextBestMale?.Player || "No male bench option"}
                          </div>
                          {benchStrategy.nextBestMale ? (
                            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                              Score {formatScore(benchStrategy.nextBestMale.Score)} | Years {benchStrategy.nextBestMale.YearsIncluded}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4">
                          <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Next Female</div>
                          <div className="mt-2 text-sm font-semibold text-white">
                            {benchStrategy.nextBestFemale?.Player || "No female bench option"}
                          </div>
                          {benchStrategy.nextBestFemale ? (
                            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                              Score {formatScore(benchStrategy.nextBestFemale.Score)} | Years {benchStrategy.nextBestFemale.YearsIncluded}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-[#8ea0b4]">Bench Core</div>
                        <div className="mt-3 space-y-2">
                          {benchStrategy.benchCore.length > 0 ? (
                            benchStrategy.benchCore.map((player, index) => (
                              <div
                                key={`${player.__name_norm}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(115,145,176,0.08)] px-3 py-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-white">{player.Player}</p>
                                  <p className="text-xs text-[color:var(--muted-foreground)]">
                                    {player.Gender} | Years {player.YearsIncluded}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-[color:var(--accent)]">
                                  {formatScore(player.Score)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[color:var(--muted-foreground)]">
                              No bench players available yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="admin-panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                      Recent History
                    </h3>
                    <span className="rounded-full border border-[rgba(115,145,176,0.12)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#9bb0c6]">
                      Last 3
                    </span>
                  </div>

                  {lineupHistory.length > 0 ? (
                    <div className="space-y-3">
                      {lineupHistory.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1.1rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                                Starting: {item.lineup.starting.slice(0, 4).map((player) => player.Player).join(", ")}
                                {item.lineup.starting.length > 4 ? "..." : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setLineup(item.lineup);
                                setPositionAssignments(createPositionAssignments(item.lineup));
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(29,215,207,0.18)] px-4 text-sm font-medium text-[color:var(--accent)] hover:bg-[rgba(29,215,207,0.12)]"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      Your last three generated lineups will appear here.
                    </p>
                  )}
                </article>
              </>
            ) : (
              <div className="rounded-[1.2rem] border border-[rgba(115,145,176,0.1)] bg-[rgba(3,11,21,0.66)] px-4 py-8 text-sm text-[color:var(--muted-foreground)]">
                Generate a lineup to see the starting 10, substitutes, warnings, and export action.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
