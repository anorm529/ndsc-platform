"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  variant = "primary",
  disabled = false,
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  variant?: "primary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  const variantClassName =
    variant === "danger"
      ? "bg-[rgba(154,34,54,0.22)] text-[color:var(--danger)] hover:border-[rgba(239,75,95,0.4)]"
      : variant === "ghost"
        ? "text-[#c5cfdb] hover:border-[color:var(--border-strong)] hover:text-white"
        : "bg-[rgba(23,129,124,0.22)] text-[color:var(--accent)] hover:border-[color:var(--border-strong)]";

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={[
        "admin-panel-soft inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName,
        className ?? "",
      ].join(" ")}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
