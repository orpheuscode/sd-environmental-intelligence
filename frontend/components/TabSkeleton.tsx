function Shimmer({ className, light }: { className: string; light?: boolean }) {
  return (
    <div className={`animate-pulse ${light ? 'bg-slate-200/70' : 'bg-slate-700/50'} rounded ${className}`} />
  );
}

export function ResidentReportSkeleton() {
  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 flex justify-between items-start gap-4">
        <div className="space-y-2">
          <Shimmer className="h-3 w-48" />
          <Shimmer className="h-3 w-32" />
        </div>
        <Shimmer className="h-10 w-28 rounded-lg" />
      </div>

      {/* Tags */}
      <div className="flex gap-2">
        <Shimmer className="h-6 w-24 rounded-full" />
        <Shimmer className="h-6 w-32 rounded-full" />
        <Shimmer className="h-6 w-20 rounded-full" />
      </div>

      {/* Report body — white card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
        <Shimmer light className="h-5 w-48 mb-4" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-5/6" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-4/5" />
        <Shimmer light className="h-5 w-40 mt-6 mb-2" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-3/4" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-5 w-36 mt-6 mb-2" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-5/6" />
        <Shimmer light className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function CityOpsViewSkeleton() {
  return (
    <div className="space-y-5">
      {/* Score + recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-3">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-10 w-28 rounded-lg" />
          <Shimmer className="h-3 w-40" />
        </div>
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-3">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-5/6" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-4/5" />
        </div>
      </div>

      {/* Risk factors */}
      <div className="flex gap-2">
        <Shimmer className="h-6 w-28 rounded-full" />
        <Shimmer className="h-6 w-36 rounded-full" />
        <Shimmer className="h-6 w-24 rounded-full" />
      </div>

      {/* Briefing body — white card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
        <Shimmer light className="h-5 w-44 mb-4" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-5/6" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-4/5" />
        <Shimmer light className="h-5 w-36 mt-6 mb-2" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function RegulatoryScorecardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Export button placeholder */}
      <div className="flex justify-end">
        <Shimmer className="h-7 w-44 rounded-lg" />
      </div>

      {/* Scorecard body — white card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-3">
        <Shimmer light className="h-5 w-52 mb-4" />
        {/* Table rows */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <Shimmer light className="h-4 flex-1" />
            <Shimmer light className="h-6 w-20 rounded-full" />
          </div>
        ))}
        <Shimmer light className="h-5 w-36 mt-6 mb-2" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-5/6" />
        <Shimmer light className="h-4 w-full" />
        <Shimmer light className="h-4 w-4/5" />
      </div>
    </div>
  );
}
