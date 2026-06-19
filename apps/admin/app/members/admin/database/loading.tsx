export default function DatabaseLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="admin-panel-soft rounded-xl p-6">
        <div className="mb-6 h-4 w-36 rounded bg-white/5" />
        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
        {/* Recent errors + imports */}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="admin-panel-soft h-40 rounded-xl" />
          <div className="admin-panel-soft h-40 rounded-xl" />
        </div>
        {/* Section cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="admin-panel-soft h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
