"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RefreshDashboardButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      disabled={isPending}
      className="admin-panel-soft inline-flex h-12 items-center justify-center gap-3 rounded-full px-5 text-base font-medium text-white hover:border-[color:var(--border-strong)] hover:text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw className={["h-5 w-5", isPending ? "animate-spin" : ""].join(" ")} />
      {isPending ? "Refreshing..." : "Refresh Dashboard"}
    </button>
  );
}
