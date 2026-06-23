"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function RemovePlayerButton({
  playerFeeId,
  playerName,
}: {
  playerFeeId: string;
  playerName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleRemove() {
    if (!window.confirm(`Remove ${playerName} from this fee season? This cannot be undone.`)) return;
    setState("loading");
    setError("");
    const res = await fetch(`/api/fees/player/${playerFeeId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to remove");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleRemove}
        disabled={state === "loading"}
        title={`Remove ${playerName} from fee season`}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[0.7rem] text-[color:var(--muted-foreground)] hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-40 transition-colors"
      >
        {state === "loading" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        Remove
      </button>
      {state === "error" && (
        <span className="text-[0.68rem] text-[color:var(--danger)]">{error}</span>
      )}
    </div>
  );
}
