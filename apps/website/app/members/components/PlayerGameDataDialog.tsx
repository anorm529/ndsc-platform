"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import type { PlayerGameRecord } from "@/app/members/data/playerGameData";

function n0(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return String(Math.round(value));
}

function n3(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(3);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

type GameWithOutAliases = PlayerGameRecord & Record<string, unknown>;

function pickGameNumber(game: GameWithOutAliases, keys: string[]): number | null {
  for (const key of keys) {
    const value = game[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function gameUao(game: PlayerGameRecord): number | null {
  return pickGameNumber(game as GameWithOutAliases, [
    "uaos",
    "uao",
    "UAOs",
    "UAO",
    "unassistedOuts",
    "unassisted_outs",
  ]);
}

function gameAo(game: PlayerGameRecord): number | null {
  return pickGameNumber(game as GameWithOutAliases, [
    "aos",
    "ao",
    "AOs",
    "AO",
    "assistedOuts",
    "assisted_outs",
  ]);
}

function gameTotalOuts(game: PlayerGameRecord): number | null {
  const explicit = pickGameNumber(game as GameWithOutAliases, [
    "totalOuts",
    "Total Outs",
    "total_outs",
    "outs",
    "OUTS",
  ]);
  if (explicit != null) return explicit;

  const uao = gameUao(game);
  const ao = gameAo(game);
  if (uao == null && ao == null) return null;
  return (uao ?? 0) + (ao ?? 0);
}

function trendLabel(delta: number | null): string {
  if (delta == null) return "flat";
  if (delta > 0.01) return "improving";
  if (delta < -0.01) return "declining";
  return "steady";
}

function trendTone(delta: number | null): string {
  if (delta == null) return "text-slate-400";
  if (delta > 0.01) return "text-teal-300";
  if (delta < -0.01) return "text-rose-300";
  return "text-amber-200";
}

type Trend = {
  label: string;
  delta: number | null;
};

function buildTrends(games: PlayerGameRecord[]): Trend[] {
  const withOps = games.filter((game) => game.ops != null).map((game) => game.ops as number);
  const withObp = games.filter((game) => game.obp != null).map((game) => game.obp as number);
  const withRuns = games.filter((game) => game.runs != null).map((game) => game.runs as number);

  const splitDelta = (values: number[]): number | null => {
    if (values.length < 2) return null;
    const latest = values.slice(-3);
    const previous = values.slice(-6, -3);
    if (!previous.length) return null;
    const latestAvg = average(latest);
    const previousAvg = average(previous);
    if (latestAvg == null || previousAvg == null) return null;
    return latestAvg - previousAvg;
  };

  return [
    { label: "OPS trend", delta: splitDelta(withOps) },
    { label: "OBP trend", delta: splitDelta(withObp) },
    { label: "Runs trend", delta: splitDelta(withRuns) },
  ];
}

export default function PlayerGameDataDialog({
  open,
  playerName,
  games,
  onClose,
}: {
  open: boolean;
  playerName: string;
  games: PlayerGameRecord[];
  onClose: () => void;
}) {
  const headingId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => (a.gameNo ?? 0) - (b.gameNo ?? 0)),
    [games]
  );
  const trends = useMemo(() => buildTrends(sortedGames), [sortedGames]);

  const chartRows = useMemo(
    () =>
      sortedGames.map((game, index) => ({
        game: game.gameNo ?? index + 1,
        ops: game.ops ?? null,
        runs: game.runs ?? null,
        uao: gameUao(game),
        ao: gameAo(game),
        totalOuts: gameTotalOuts(game),
      })),
    [sortedGames]
  );

  const outsSummary = useMemo(() => {
    const uaoValues = sortedGames
      .map((game) => gameUao(game))
      .filter((value): value is number => value != null);
    const aoValues = sortedGames
      .map((game) => gameAo(game))
      .filter((value): value is number => value != null);
    const totalOutValues = sortedGames
      .map((game) => gameTotalOuts(game))
      .filter((value): value is number => value != null);

    const avgUao = average(uaoValues);
    const avgAo = average(aoValues);
    const avgTotalOuts = average(totalOutValues);
    const mixDenominator = (avgUao ?? 0) + (avgAo ?? 0);
    const uaoShare = mixDenominator > 0 ? (avgUao ?? 0) / mixDenominator : null;
    const aoShare = mixDenominator > 0 ? (avgAo ?? 0) / mixDenominator : null;

    return { avgUao, avgAo, avgTotalOuts, uaoShare, aoShare };
  }, [sortedGames]);

  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasData = sortedGames.length > 0;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={`Close game data for ${playerName}`}
        className="absolute inset-0 bg-[#040915]/75 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-10 w-full max-w-5xl rounded-2xl border border-slate-600 bg-[#0D172D] shadow-2xl"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close game data modal"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-700/40 text-slate-200 transition hover:bg-slate-700/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50"
        >
          X
        </button>

        <div className="border-b border-[#2B4162] px-5 py-4 pr-12">
          <h3 id={headingId} className="text-lg font-semibold text-white">
            {playerName}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-teal-400/80">
            Per-Game Data
          </p>
        </div>

        <div className="max-h-[80vh] space-y-5 overflow-y-auto px-5 py-4">
          {!hasData ? (
            <div className="rounded-xl border border-[#2B4162] bg-slate-700/30 p-4 text-sm text-slate-200">
              Whoops, you eager beaver, no data currently available
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {trends.map((trend) => (
                  <div
                    key={trend.label}
                    className="rounded-xl border border-[#2B4162] bg-slate-700/30 px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      {trend.label}
                    </div>
                    <div className={`mt-1 text-sm font-semibold ${trendTone(trend.delta)}`}>
                      {trendLabel(trend.delta)}
                      {trend.delta != null ? ` (${trend.delta >= 0 ? "+" : ""}${trend.delta.toFixed(3)})` : ""}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[#2B4162] bg-slate-700/30 p-4">
                  <div className="text-sm font-semibold text-white">OPS by game</div>
                  <div className="mt-3 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="game" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="ops"
                          stroke="rgba(45,212,191,0.95)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-[#2B4162] bg-slate-700/30 p-4">
                  <div className="text-sm font-semibold text-white">Runs by game</div>
                  <div className="mt-3 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="game" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="runs" fill="rgba(96,165,250,0.8)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#2B4162] bg-slate-700/30 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Outs by game</div>
                    <div className="mt-1 text-xs text-slate-400">UAO vs AO vs Total Outs</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Avg UAO: {n3(outsSummary.avgUao)} | Avg AO: {n3(outsSummary.avgAo)} | Avg OUTS:{" "}
                    {n3(outsSummary.avgTotalOuts)}
                  </div>
                </div>
                <div className="mt-3 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="game" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="uao" name="UAO" stroke="rgba(45,212,191,0.95)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="ao" name="AO" stroke="rgba(96,165,250,0.95)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line
                        type="monotone"
                        dataKey="totalOuts"
                        name="Total Outs"
                        stroke="rgba(251,191,36,0.95)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[#2B4162] bg-slate-700/20 px-3 py-2 text-xs text-slate-300">
                    UAO share of tracked outs:{" "}
                    <span className="font-semibold text-white">
                      {outsSummary.uaoShare == null ? "-" : `${(outsSummary.uaoShare * 100).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="rounded-lg border border-[#2B4162] bg-slate-700/20 px-3 py-2 text-xs text-slate-300">
                    AO share of tracked outs:{" "}
                    <span className="font-semibold text-white">
                      {outsSummary.aoShare == null ? "-" : `${(outsSummary.aoShare * 100).toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#2B4162]">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-white">
                  <thead>
                    <tr className="bg-slate-700/40">
                      <th className="border-b border-[#2B4162] px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-300">
                        Game
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-300">
                        Opponent
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-300">
                        H/A
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        OPS
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        OBP
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        SLG
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        AB
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        OB
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        RBI
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        Runs
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        UAO
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        AO
                      </th>
                      <th className="border-b border-[#2B4162] px-3 py-2 text-right text-xs uppercase tracking-wide text-slate-300">
                        OUTS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGames.map((game, index) => (
                      <tr
                        key={`${game.gameNo ?? index}-${game.opponent ?? "x"}-${index}`}
                        className="odd:bg-slate-700/20"
                      >
                        <td className="border-b border-[#2B4162] px-3 py-2 text-sm">
                          {n0(game.gameNo)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-sm">
                          {game.opponent ?? "-"}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-sm">
                          {game.homeAway ?? "-"}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n3(game.ops)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n3(game.obp)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n3(game.slg)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(game.totalAb)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(game.totalOb)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(game.rbi)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(game.runs)}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(gameUao(game))}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(gameAo(game))}
                        </td>
                        <td className="border-b border-[#2B4162] px-3 py-2 text-right text-sm">
                          {n0(gameTotalOuts(game))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
