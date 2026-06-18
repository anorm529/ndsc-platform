import { AlertCircle, CheckCircle2 } from "lucide-react";

const toneMap = {
  success: {
    wrapper: "bg-[rgba(22,135,91,0.18)] text-[color:var(--success)]",
    icon: CheckCircle2,
  },
  danger: {
    wrapper: "bg-[rgba(125,22,38,0.22)] text-[color:var(--danger)]",
    icon: AlertCircle,
  },
};

export function ActivityItem({
  title,
  actor,
  time,
  tone,
}: {
  title: string;
  actor: string;
  time: string;
  tone: keyof typeof toneMap;
}) {
  const Icon = toneMap[tone].icon;

  return (
    <div className="flex items-start gap-4">
      <div
        className={[
          "mt-1 flex h-8 w-8 items-center justify-center rounded-full",
          toneMap[tone].wrapper,
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[1.05rem] font-medium tracking-[-0.03em] text-white sm:text-[1.1rem]">
          {title}
        </p>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)] sm:text-base">
          {actor} • {time}
        </p>
      </div>
    </div>
  );
}
