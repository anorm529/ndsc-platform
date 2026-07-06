"use client";

import { useState } from "react";
import PlayerGameDataDialog from "@/app/members/components/PlayerGameDataDialog";
import type { PlayerGameRecord } from "@/app/members/data/playerGameData";

export default function CareerStatsTrigger({
  label,
  games,
}: {
  label: string;
  games: PlayerGameRecord[];
}) {
  const [open, setOpen] = useState(false);

  if (games.length === 0) {
    return <span className="text-slate-300">{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-slate-300 underline-offset-2 hover:text-teal-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50 rounded-sm"
      >
        {label}
      </button>
      <PlayerGameDataDialog
        open={open}
        playerName={label}
        games={games}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
