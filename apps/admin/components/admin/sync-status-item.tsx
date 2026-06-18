import { Clock3 } from "lucide-react";

export function SyncStatusItem({
  label,
  time,
}: {
  label: string;
  time: string;
}) {
  return (
    <div className="admin-panel-soft flex items-center justify-between gap-4 rounded-[1.45rem] px-5 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="h-3.5 w-3.5 rounded-full bg-[color:var(--success)] shadow-[0_0_12px_rgba(24,213,141,0.4)]" />
        <span className="truncate text-[1.05rem] font-medium tracking-[-0.03em] text-white sm:text-[1.1rem]">
          {label}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm text-[color:var(--muted-foreground)] sm:text-base">
        <Clock3 className="h-4 w-4" />
        {time}
      </div>
    </div>
  );
}
