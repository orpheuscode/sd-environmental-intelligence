'use client';

const STEPS = [
  { label: 'geocode →', detail: 'Census Geocoder API' },
  { label: 'fetch →',   detail: 'EPA AirNow + Purple Air sensors' },
  { label: 'fetch →',   detail: 'SD Socrata drinking water CSV' },
  { label: 'fetch →',   detail: 'ocean bacteria + NOAA precip grid' },
  { label: 'compute →', detail: 'contamination risk score' },
  { label: 'analyze →', detail: 'Claude Sonnet 4 agent' },
];

export default function ProgressSteps({ step }: { step: number }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden min-h-48">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-amber-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="text-slate-400 text-sm ml-2 font-mono">sd-env-intelligence</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-300 text-sm font-mono font-medium">running</span>
        </span>
      </div>

      {/* Log lines */}
      <div className="px-5 py-4 font-mono space-y-0.5">
        {STEPS.map((s, i) => {
          const done    = i < step;
          const active  = i === step;
          const pending = i > step;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 py-2 transition-opacity duration-300 ${pending ? 'opacity-20' : 'opacity-100'}`}
            >
              {/* status glyph */}
              <span className="w-4 flex-shrink-0 text-center">
                {done    && <span className="text-emerald-400 text-base">✓</span>}
                {active  && <span className="text-blue-300 text-base animate-pulse">›</span>}
                {pending && <span className="text-slate-600 text-base">·</span>}
              </span>

              {/* label — fixed width column */}
              <span className={`flex-shrink-0 min-w-[110px] text-sm font-semibold ${done ? 'text-slate-500' : active ? 'text-blue-200' : 'text-slate-600'}`}>
                {s.label}
              </span>

              {/* detail */}
              <span className={`text-sm leading-relaxed ${done ? 'text-slate-500' : active ? 'text-slate-200' : 'text-slate-600'}`}>
                {s.detail}
              </span>

              {/* right side */}
              <span className="ml-auto flex-shrink-0">
                {done   && <span className="text-green-400 text-sm font-mono">ok</span>}
                {active && <span className="text-blue-400 text-sm animate-pulse">▌</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
