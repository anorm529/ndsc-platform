export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="admin-panel-soft h-24 rounded-xl" />
        ))}
      </div>

      {/* Health + Flags */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="admin-panel-soft h-64 rounded-xl" />
        <div className="admin-panel-soft h-64 rounded-xl" />
      </div>

      {/* Table counts */}
      <div className="admin-panel-soft rounded-xl p-6">
        <div className="mb-6 h-4 w-40 rounded bg-white/5" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
