"use client";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-semibold text-[#c5cfdb]">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
      >
        Try again
      </button>
    </div>
  );
}
