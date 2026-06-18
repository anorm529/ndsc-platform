"use client";

import { useState } from "react";
import PlayerAwardsDialog from "@/app/members/components/PlayerAwardsDialog";
import PlayerGameDataDialog from "@/app/members/components/PlayerGameDataDialog";
import type { PlayerAward } from "@/app/members/lib/playerAwards";
import type { PlayerGameRecord } from "@/app/members/data/playerGameData";

export default function PlayerAwardsTrigger({
  playerName,
  awards,
  games,
}: {
  playerName: string;
  awards: PlayerAward[];
  games: PlayerGameRecord[];
}) {
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`View game data for ${playerName}`}
          className="truncate text-left text-white hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50 rounded-sm"
          onClick={() => setGamesOpen(true)}
        >
          {playerName}
        </button>

        {awards.length > 0 ? (
          <button
            type="button"
            title="View awards"
            aria-label={`View awards for ${playerName}`}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-amber-200/90 transition hover:border-amber-200/45 hover:bg-amber-300/15 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
            onClick={() => setAwardsOpen(true)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d="M8 3a1 1 0 0 0-1 1v1H5a1 1 0 0 0-1 1v1a5 5 0 0 0 4 4.9V14H7a1 1 0 1 0 0 2h2v2.1a3 3 0 1 0 6 0V16h2a1 1 0 1 0 0-2h-1v-2.1A5 5 0 0 0 20 7V6a1 1 0 0 0-1-1h-2V4a1 1 0 0 0-1-1H8Zm-2 4V7h1v2.83A3 3 0 0 1 6 7Zm11 2.83V7h1a3 3 0 0 1-1 2.83Z" />
            </svg>
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}
      </div>

      <PlayerAwardsDialog
        open={awardsOpen}
        playerName={playerName}
        awards={awards}
        onClose={() => setAwardsOpen(false)}
      />

      <PlayerGameDataDialog
        open={gamesOpen}
        playerName={playerName}
        games={games}
        onClose={() => setGamesOpen(false)}
      />
    </>
  );
}
