"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-semibold text-slate-600">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="rounded-lg bg-ndsc-navy px-4 py-2 text-sm font-semibold text-white hover:bg-ndsc-navy/90"
      >
        Try again
      </button>
    </div>
  );
}
