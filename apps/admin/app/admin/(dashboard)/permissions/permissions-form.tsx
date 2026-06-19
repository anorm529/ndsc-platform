"use client";

import { useActionState } from "react";
import { saveUserAppPermissionsAction } from "./actions";
import type { App } from "@ndsc/auth";

type Props = {
  userId: string;
  app: App;
  permissions: readonly string[];
  labels: Record<string, string>;
  granted: Set<string>;
};

const initialState = { error: undefined as string | undefined, success: undefined as string | undefined };

export function PermissionsForm({ userId, app, permissions, labels, granted }: Props) {
  const [state, action, isPending] = useActionState(saveUserAppPermissionsAction, initialState);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="app" value={app} />

      <div className="space-y-1.5">
        {permissions.map((perm) => (
          <label
            key={perm}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 transition hover:bg-[rgba(255,255,255,0.05)]"
          >
            <input
              type="checkbox"
              name={`perm_${perm}`}
              defaultChecked={granted.has(perm)}
              className="h-3.5 w-3.5 rounded accent-[color:var(--accent)]"
            />
            <span className="text-xs font-medium text-[#c5cfdb]">{labels[perm] ?? perm}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {state.success && (
          <span className="text-xs text-[color:var(--success)]">{state.success}</span>
        )}
        {state.error && (
          <span className="text-xs text-[color:var(--danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
