import type { LucideIcon } from "lucide-react";

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  className = "",
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`admin-panel rounded-[2rem] px-5 py-6 sm:px-7 sm:py-7 ${className}`}>
      {title ? (
        <div>
          <div className="flex items-center gap-3">
            {Icon ? (
              <Icon className={`h-5 w-5 ${iconClassName ?? "text-white"}`} />
            ) : null}
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.05em] text-white sm:text-[1.5rem]">
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)] sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={title ? "" : ""}>{children}</div>
    </section>
  );
}
