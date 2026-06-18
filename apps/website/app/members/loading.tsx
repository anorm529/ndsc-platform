export default function MembersLoading() {
  return (
    <div className="min-h-screen bg-[#0F172A]">
      <div className="h-[105px] w-full border-b border-slate-700 bg-[#0A1628]/95" />
      <div className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-slate-700/60" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-700/40 border border-[#2B4162]" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-700/40 border border-[#2B4162]" />
        </div>
      </div>
    </div>
  );
}
