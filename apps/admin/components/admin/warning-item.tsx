import { AlertTriangle } from "lucide-react";

const toneMap = {
  danger: {
    ring: "bg-[rgba(118,21,35,0.32)] text-[color:var(--danger)]",
    icon: "text-[color:var(--danger)]",
  },
  warning: {
    ring: "bg-[rgba(118,92,18,0.28)] text-[color:var(--warning)]",
    icon: "text-[color:var(--warning)]",
  },
  muted: {
    ring: "bg-[rgba(49,61,77,0.4)] text-[#8d97a7]",
    icon: "text-[#8d97a7]",
  },
};

export function WarningItem({
  title,
  category,
  description,
  tone,
}: {
  title: string;
  category: string;
  description: string;
  tone: keyof typeof toneMap;
}) {
  return (
    <div className="admin-panel-soft flex items-start gap-4 rounded-[1.45rem] px-4 py-4 sm:px-5">
      <div
        className={[
          "mt-0.5 flex h-9 w-9 items-center justify-center rounded-full",
          toneMap[tone].ring,
        ].join(" ")}
      >
        <AlertTriangle className={["h-4 w-4", toneMap[tone].icon].join(" ")} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-[1.05rem] font-medium tracking-[-0.03em] text-white sm:text-[1.1rem]">
            {title}
          </h3>
          <span className="rounded-full border border-[rgba(102,129,157,0.22)] bg-[rgba(10,24,40,0.7)] px-3 py-1 text-xs font-medium text-[#d0d7e0] sm:text-sm">
            {category}
          </span>
        </div>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)] sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
