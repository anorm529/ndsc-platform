"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

export function UnenrollButton({
  playerId,
  playerName,
  seasonId,
}: {
  playerId: string;
  playerName: string;
  seasonId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`Remove ${playerName} from this season?`)) return;
    setLoading(true);
    try {
      await fetch("/api/seasons/enroll", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, seasonId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={`Remove ${playerName} from season`}
      className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--muted-foreground)] hover:bg-[rgba(239,68,68,0.1)] hover:text-[color:var(--danger)] disabled:opacity-40 transition-colors"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
    </button>
  );
}
