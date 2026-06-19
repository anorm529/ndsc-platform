"use client";

export default function MembersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0F172A] px-6 text-white">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-400">An unexpected error occurred loading this page.</p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
