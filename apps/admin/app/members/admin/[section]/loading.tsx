export default function SectionLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="admin-panel-soft rounded-xl p-6">
        <div className="mb-6 h-4 w-48 rounded bg-white/5" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
