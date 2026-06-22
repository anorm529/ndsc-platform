"use client";

import { useMemo, useState } from "react";
import PlayerAwardsTrigger from "@/app/members/components/PlayerAwardsTrigger";
import { STAT_INFO } from "@/app/members/components/statsGlossary";
import {
  normalizePlayerName,
  normalizeRecordId,
} from "@/app/members/lib/playerAwards";
import type {
  AwardsLookup,
  GameDataLookup,
  PlayerStat,
} from "@/lib/ndsc-data";

type SortDir = "asc" | "desc";
type SortKey =
  | "playerName"
  | "gamesPlayed"
  | "innings"
  | "singles_1b"
  | "doubles_2b"
  | "triples_3b"
  | "hr"
  | "bb"
  | "obp"
  | "avg"
  | "slg"
  | "ab"
  | "ob"
  | "batterout"
  | "ops"
  | "hits"
  | "runs"
  | "rbi"
  | "uao"
  | "ao"
  | "outs";

type Column = {
  key: SortKey;
  code: string;
  label: string;
  width: string;
  decimals?: boolean;
  primary?: boolean;
};

const columns: Column[] = [
  { key: "gamesPlayed", code: "GP", label: "Games", width: "w-[70px]" },
  { key: "innings", code: "INN", label: "Innings", width: "w-[70px]" },
  { key: "singles_1b", code: "1B", label: "Singles", width: "w-[70px]" },
  { key: "doubles_2b", code: "2B", label: "Doubles", width: "w-[70px]" },
  { key: "triples_3b", code: "3B", label: "Triples", width: "w-[70px]" },
  { key: "hr", code: "HR", label: "HR", width: "w-[70px]" },
  { key: "bb", code: "BB", label: "Walks", width: "w-[70px]" },
  { key: "obp", code: "OBP", label: "OBP", width: "w-[80px]", decimals: true, primary: true },
  { key: "avg", code: "AVG", label: "AVG", width: "w-[80px]", decimals: true, primary: true },
  { key: "slg", code: "SLG", label: "SLG", width: "w-[80px]", decimals: true, primary: true },
  { key: "ab", code: "AB", label: "AB", width: "w-[70px]" },
  { key: "ob", code: "OB", label: "OB", width: "w-[70px]" },
  { key: "batterout", code: "BO", label: "Batter out", width: "w-[70px]" },
  { key: "ops", code: "OPS", label: "OPS", width: "w-[80px]", decimals: true, primary: true },
  { key: "hits", code: "H", label: "Hits", width: "w-[70px]" },
  { key: "runs", code: "R", label: "Runs", width: "w-[70px]" },
  { key: "rbi", code: "RBI", label: "RBI", width: "w-[70px]" },
  { key: "uao", code: "UAO", label: "UAO", width: "w-[70px]" },
  { key: "ao", code: "AO", label: "AO", width: "w-[70px]" },
  { key: "outs", code: "OUTS", label: "Outs", width: "w-[80px]" },
];

const TH =
  "py-3 px-3 text-xs font-semibold uppercase tracking-wide text-teal-300/80 border-b border-slate-600 border-r border-[#2B4162] whitespace-nowrap";
const TD =
  "py-3 px-3 text-sm text-white border-b border-[#2B4162] border-r border-[#2B4162] whitespace-nowrap";

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function n3(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(3);
}

function n0(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return String(Math.round(n));
}

function statValue(player: PlayerStat, key: SortKey) {
  if (key === "playerName") return player.playerName;
  return (player as Record<string, unknown>)[key];
}

function pickPlayerRecordId(row: object): string | null {
  const source = row as Record<string, unknown>;
  const keys = [
    "record id",
    "Record ID",
    "recordId",
    "record_id",
    "playerRecordId",
    "player_record_id",
    "Player Record ID",
    "Player ID",
    "playerId",
  ];

  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }

  return null;
}

function compareValues(a: unknown, b: unknown, dir: SortDir) {
  const an = Number(a);
  const bn = Number(b);
  const bothNumbers = Number.isFinite(an) && Number.isFinite(bn);
  const result = bothNumbers
    ? an - bn
    : String(a ?? "").localeCompare(String(b ?? ""), undefined, { sensitivity: "base" });

  return dir === "asc" ? result : -result;
}

function HeaderWithTip({ code }: { code: string }) {
  const info = STAT_INFO[code];

  return (
    <span className="relative group inline-flex items-center justify-end gap-2">
      <span>{code}</span>
      {info ? (
        <>
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-300 group-hover:text-white">
            i
          </span>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-600 bg-[#1D2E48] p-3 text-left text-xs text-slate-200 opacity-0 shadow-xl transition group-hover:opacity-100">
            <div className="font-semibold text-white">{info.label}</div>
            <div className="mt-1 text-slate-300">{info.definition}</div>
            {info.calc ? (
              <div className="mt-2 rounded-lg bg-slate-700/50 px-2 py-1 font-mono text-[11px] text-slate-200">
                {info.calc}
              </div>
            ) : null}
          </span>
        </>
      ) : null}
    </span>
  );
}

function SortButton({
  column,
  active,
  dir,
  onSort,
}: {
  column: Column;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className="inline-flex w-full items-center justify-end gap-1 text-right hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50"
      aria-label={`Sort by ${column.label}`}
    >
      <HeaderWithTip code={column.code} />
      <span className={cn("text-[10px]", active ? "text-teal-400" : "text-slate-600")}>
        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

function PlayerCell({
  player,
  awardsLookup,
  gameDataLookup,
}: {
  player: PlayerStat;
  awardsLookup: AwardsLookup;
  gameDataLookup: GameDataLookup;
}) {
  const recordIdRaw = pickPlayerRecordId(player);
  const recordId = recordIdRaw ? normalizeRecordId(recordIdRaw) : null;
  const playerNameKey = normalizePlayerName(player.playerName);
  const awardsByRecordId = recordId ? awardsLookup.byRecordId[recordId] : undefined;
  const matchedByRecordId = awardsByRecordId?.filter(
    (entry) => !entry.playerNameKey || entry.playerNameKey === playerNameKey
  );
  const awards =
    (matchedByRecordId && matchedByRecordId.length > 0 ? matchedByRecordId : undefined) ??
    awardsLookup.byName[playerNameKey] ??
    [];
  const gamesByRecordId = recordId ? gameDataLookup.byRecordId[recordId] : undefined;
  const games =
    (gamesByRecordId && gamesByRecordId.length > 0 ? gamesByRecordId : undefined) ??
    gameDataLookup.byName[playerNameKey] ??
    [];

  return <PlayerAwardsTrigger playerName={player.playerName} awards={awards} games={games} />;
}

export default function PlayerStatsTable({
  players,
  awardsLookup,
  gameDataLookup,
  emptyMessage,
  currentPlayerName,
  currentPlayerId,
}: {
  players: PlayerStat[];
  awardsLookup: AwardsLookup;
  gameDataLookup: GameDataLookup;
  emptyMessage: React.ReactNode;
  currentPlayerName?: string;
  currentPlayerId?: string;
}) {
  function isMe(player: PlayerStat): boolean {
    if (!currentPlayerName && !currentPlayerId) return false;
    if (currentPlayerId && player.recordId) {
      if (normalizeRecordId(player.recordId) === normalizeRecordId(currentPlayerId)) return true;
    }
    return currentPlayerName
      ? normalizePlayerName(player.playerName) === normalizePlayerName(currentPlayerName)
      : false;
  }
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ops");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const visiblePlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((player) => !q || player.playerName.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => compareValues(statValue(a, sortKey), statValue(b, sortKey), sortDir));
  }, [players, query, sortDir, sortKey]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "playerName" ? "asc" : "desc");
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Player stats</h2>
          <p className="mt-1 text-sm text-slate-400">
            {visiblePlayers.length} of {players.length} players shown
          </p>
        </div>

        <label className="w-full max-w-sm">
          <span className="sr-only">Search players</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search players"
            className="w-full rounded-xl border border-slate-600 bg-[#1D2E48] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300/50 focus:bg-slate-700/60"
          />
        </label>
      </div>

      <div className="themed-scrollbar mt-5 hidden rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-6 overflow-x-auto md:block">
        <table className="w-full text-white border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={cn(TH, "text-left sticky left-0 bg-[#1D2E48]/95 backdrop-blur z-10 w-[240px]")}>
                <button
                  type="button"
                  onClick={() => onSort("playerName")}
                  className="inline-flex items-center gap-1 text-left hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50"
                >
                  Player
                  <span className={cn("text-[10px]", sortKey === "playerName" ? "text-teal-400" : "text-slate-600")}>
                    {sortKey === "playerName" ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </th>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={cn(
                    TH,
                    "text-right",
                    column.width,
                    index === columns.length - 1 && "border-r-0"
                  )}
                >
                  <SortButton
                    column={column}
                    active={sortKey === column.key}
                    dir={sortDir}
                    onSort={onSort}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visiblePlayers.map((player) => (
              <tr
                key={`${player.playerName}-${player.season ?? "x"}`}
                className={cn(
                  "transition",
                  isMe(player)
                    ? "bg-teal-500/[0.08] hover:bg-teal-500/[0.13]"
                    : "odd:bg-slate-700/20 hover:bg-slate-700/50"
                )}
              >
                <td className={cn(TD, "text-left font-medium sticky left-0 backdrop-blur z-10 w-[240px]", isMe(player) ? "bg-teal-500/20" : "bg-[#1D2E48]/90")}>
                  <div className="flex items-center gap-2">
                    <PlayerCell player={player} awardsLookup={awardsLookup} gameDataLookup={gameDataLookup} />
                    {isMe(player) && (
                      <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                        You
                      </span>
                    )}
                  </div>
                </td>

                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      TD,
                      "text-right",
                      column.width,
                      column.key === "ops" && "font-semibold text-teal-300",
                      index === columns.length - 1 && "border-r-0"
                    )}
                  >
                    {column.decimals ? n3(statValue(player, column.key)) : n0(statValue(player, column.key))}
                  </td>
                ))}
              </tr>
            ))}

            {visiblePlayers.length === 0 ? (
              <tr>
                <td className="py-4 text-slate-300" colSpan={columns.length + 1}>
                  {players.length === 0 ? emptyMessage : "No players match your search."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 md:hidden">
        {visiblePlayers.map((player) => (
          <div
            key={`${player.playerName}-${player.season ?? "x"}-card`}
            className={cn(
              "rounded-2xl border p-5",
              isMe(player)
                ? "border-teal-400/30 bg-teal-500/[0.08]"
                : "border-[#2B4162] bg-[#1D2E48]"
            )}
          >
            <div className="flex items-center gap-2 text-base font-semibold text-white">
              <PlayerCell player={player} awardsLookup={awardsLookup} gameDataLookup={gameDataLookup} />
              {isMe(player) && (
                <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                  You
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {columns.filter((column) => column.primary).map((column) => (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => onSort(column.key)}
                  className="rounded-xl border border-[#2B4162] bg-slate-700/40 px-2 py-3 text-center"
                >
                  <div className="text-[11px] font-semibold text-slate-400">{column.code}</div>
                  <div className={cn("mt-1 text-sm font-semibold", column.key === "ops" ? "text-teal-300" : "text-white")}>
                    {n3(statValue(player, column.key))}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {[
                ["GP", player.gamesPlayed],
                ["AB", player.ab],
                ["H", player.hits],
                ["R", player.runs],
                ["RBI", player.rbi],
                ["HR", player.hr],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-slate-700/40 px-3 py-2">
                  <div className="text-slate-500">{label}</div>
                  <div className="font-semibold text-white">{n0(value)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {visiblePlayers.length === 0 ? (
          <div className="rounded-2xl border border-[#2B4162] bg-[#1D2E48] p-5 text-sm text-slate-300">
            {players.length === 0 ? emptyMessage : "No players match your search."}
          </div>
        ) : null}
      </div>
    </section>
  );
}
