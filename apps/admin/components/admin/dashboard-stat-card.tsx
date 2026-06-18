import type { LucideIcon } from "lucide-react";

const accentMap = {
  teal: "bg-[rgba(12,84,86,0.44)] text-[color:var(--accent)]",
  blue: "bg-[rgba(5,54,94,0.35)] text-[#1e9bff]",
  gold: "bg-[rgba(120,91,20,0.32)] text-[#e5b83f]",
  cyan: "bg-[rgba(3,70,105,0.36)] text-[#00c6df]",
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: keyof typeof accentMap;
}) {
  return (
    <article className="admin-panel rounded-[2rem] px-5 py-6 sm:px-6 sm:py-7">
      <div className="flex items-center gap-5">
        <div
          className={[
            "flex h-16 w-16 items-center justify-center rounded-[1.45rem]",
            accentMap[accent],
          ].join(" ")}
        >
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <div className="text-[2.25rem] font-semibold tracking-[-0.06em] text-white">
            {value}
          </div>
          <div className="text-[1.05rem] text-[color:var(--muted-foreground)]">
            {label}
          </div>
        </div>
      </div>
    </article>
  );
}
