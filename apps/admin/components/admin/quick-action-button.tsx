import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function QuickActionButton({
  label,
  icon: Icon,
  href,
}: {
  label: string;
  icon: LucideIcon;
  href?: string;
}) {
  const className =
    "admin-panel-soft flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-[1.4rem] px-5 py-6 text-center text-[#c7d0db] hover:border-[color:var(--border-strong)] hover:bg-[rgba(13,31,51,0.9)] hover:text-white";

  const content = (
    <>
      <Icon className="h-5 w-5 text-[#b0b8c4]" />
      <span className="text-[1.02rem] font-medium tracking-[-0.02em]">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        scroll
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
    >
      {content}
    </button>
  );
}
