'use client';

import { useState, useEffect } from 'react';

// ── Static data definitions ────────────────────────────────────────────────

const SOURCES = [
  { label: 'EPA AirNow',           type: 'air',    url: 'https://www.airnowapi.org/' },
  { label: 'Purple Air',           type: 'air',    url: 'https://www.purpleair.com/' },
  { label: 'Drinking Water Chem',  type: 'water',  url: 'https://data.sandiego.gov/datasets/water-quality-distribution-system/' },
  { label: 'Bacteria Monitoring',  type: 'water',  url: 'https://data.sandiego.gov/datasets/water-quality-bacteria/' },
  { label: 'Ocean Water Quality',  type: 'water',  url: 'https://data.sandiego.gov/datasets/ocean-water-quality/' },
  { label: 'NOAA Precipitation',   type: 'water',  url: 'https://www.weather.gov/' },
  { label: 'Census Geocoder',      type: 'gov',    url: 'https://geocoding.geo.census.gov/' },
  { label: 'IBWC (TJ River)',      type: 'water',  url: 'https://www.ibwc.gov/' },
  { label: 'CDC PLACES',           type: 'health', url: 'https://www.cdc.gov/places/' },
  { label: 'Beach Closures (DEH)', type: 'water',  url: 'https://www.sandiegocounty.gov/content/sdc/deh/water/beach.html' },
];

const AGENTS = [
  { label: 'Resident Health Agent',     color: '#3b82f6', bg: '#1e3a5f' },
  { label: 'City Operations Agent',     color: '#f59e0b', bg: '#451a03' },
  { label: 'Regulatory Agent',          color: '#a855f7', bg: '#2e1065' },
];

const OUTPUTS = [
  { label: 'Personal Health Score',       agent: 0 },
  { label: 'Action Checklist',            agent: 0 },
  { label: '72-Hr Resource Plan',         agent: 1 },
  { label: 'Regulatory Scorecard',        agent: 2 },
];

// source_idx → agent_idx[]
const SRC_TO_AGT: number[][] = [
  [0, 1],    // EPA AirNow
  [0, 1],    // Purple Air
  [0, 1, 2], // Drinking Water Chem
  [0, 1, 2], // Bacteria Monitoring
  [0, 1],    // Ocean Water Quality
  [0, 1],    // NOAA Precipitation
  [0, 1, 2], // Census Geocoder
  [0, 1, 2], // IBWC (TJ River)
  [0, 2],    // CDC PLACES
  [0, 1],    // Beach Closures
];

// agent_idx → output_idx[]
const AGT_TO_OUT: number[][] = [
  [0, 1], // Resident → Personal Health Score, Action Checklist
  [2],    // City Ops → 72-Hr Resource Plan
  [3],    // Regulatory → Regulatory Scorecard
];

const TYPE_COLOR: Record<string, string> = {
  air:    '#22c55e',
  water:  '#3b82f6',
  gov:    '#f59e0b',
  health: '#a855f7',
};

// ── SVG Layout constants ───────────────────────────────────────────────────

const VW = 820;
const VH = 540;

// Source nodes — 10 nodes, y_centers spaced 48px apart from y=48
const SRC_X  = 5;
const SRC_W  = 194;
const SRC_H  = 32;
const SRC_Y  = [48, 96, 144, 192, 240, 288, 336, 384, 432, 480];

// Agent nodes — 3 agents
const AGT_X  = 313;
const AGT_W  = 194;
const AGT_H  = 40;
const AGT_Y  = [144, 264, 432]; // visually align with sources 2, 5, 9

// Output nodes — 4 outputs
const OUT_X  = 621;
const OUT_W  = 194;
const OUT_H  = 32;
const OUT_Y  = [96, 192, 264, 432]; // near their feeding agent

// Connection x-positions
const SRC_RIGHT = SRC_X + SRC_W;   // 199
const AGT_LEFT  = AGT_X;           // 313
const AGT_RIGHT = AGT_X + AGT_W;   // 507
const OUT_LEFT  = OUT_X;           // 621

// ── Hover logic ────────────────────────────────────────────────────────────

type HoverTarget =
  | { col: 'src'; idx: number }
  | { col: 'agt'; idx: number }
  | { col: 'out'; idx: number }
  | null;

function isSrcAgtLit(h: HoverTarget, s: number, a: number): boolean {
  if (!h) return false;
  if (h.col === 'src') return h.idx === s;
  if (h.col === 'agt') return h.idx === a;
  if (h.col === 'out') {
    const fdr = OUTPUTS[h.idx].agent;
    return fdr === a && (SRC_TO_AGT[s]?.includes(a) ?? false);
  }
  return false;
}

function isAgtOutLit(h: HoverTarget, a: number, o: number): boolean {
  if (!h) return false;
  if (h.col === 'agt') return h.idx === a;
  if (h.col === 'out') return h.idx === o;
  if (h.col === 'src') return SRC_TO_AGT[h.idx]?.includes(a) ?? false;
  return false;
}

function isSrcLit(h: HoverTarget, s: number): boolean {
  if (!h) return false;
  if (h.col === 'src') return h.idx === s;
  if (h.col === 'agt') return SRC_TO_AGT[s]?.includes(h.idx) ?? false;
  if (h.col === 'out') {
    const a = OUTPUTS[h.idx].agent;
    return SRC_TO_AGT[s]?.includes(a) ?? false;
  }
  return false;
}

function isAgtLit(h: HoverTarget, a: number): boolean {
  if (!h) return false;
  if (h.col === 'agt') return h.idx === a;
  if (h.col === 'src') return SRC_TO_AGT[h.idx]?.includes(a) ?? false;
  if (h.col === 'out') return OUTPUTS[h.idx].agent === a;
  return false;
}

function isOutLit(h: HoverTarget, o: number): boolean {
  if (!h) return false;
  if (h.col === 'out') return h.idx === o;
  if (h.col === 'agt') return AGT_TO_OUT[h.idx]?.includes(o) ?? false;
  if (h.col === 'src') {
    const agents = SRC_TO_AGT[h.idx] ?? [];
    return agents.some(a => AGT_TO_OUT[a]?.includes(o));
  }
  return false;
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  /** Optional live status flags per source key */
  sourceStatus?: Record<string, boolean>;
}

export default function DataFlowViz({ sourceStatus }: Props) {
  const [hover, setHover] = useState<HoverTarget>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(window.innerWidth >= 768);
  }, []);

  const hasHover = hover !== null;

  function pathOpacity(lit: boolean): number {
    if (!hasHover) return 0.22;
    return lit ? 0.75 : 0.04;
  }

  function pathWidth(lit: boolean): number {
    if (!hasHover) return 1.5;
    return lit ? 2.5 : 1;
  }

  function nodeOpacity(lit: boolean): number {
    if (!hasHover) return 1;
    return lit ? 1 : 0.3;
  }

  // bezier from source right → agent left
  function srcPath(sy: number, ay: number): string {
    const mx = (SRC_RIGHT + AGT_LEFT) / 2;
    return `M${SRC_RIGHT},${sy} C${mx},${sy} ${mx},${ay} ${AGT_LEFT},${ay}`;
  }

  // bezier from agent right → output left
  function agtPath(ay: number, oy: number): string {
    const mx = (AGT_RIGHT + OUT_LEFT) / 2;
    return `M${AGT_RIGHT},${ay} C${mx},${ay} ${mx},${oy} ${OUT_LEFT},${oy}`;
  }

  const totalSources = SOURCES.length;

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Data Architecture</span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          {expanded ? 'collapse' : 'expand'}
        </button>
      </div>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-4 py-2.5 text-xs text-slate-500">
          Synthesizing{' '}
          <span className="text-slate-300 font-medium">{totalSources} city data sources</span>{' '}
          through{' '}
          <span className="text-slate-300 font-medium">3 AI agents</span>{' '}
          → real-time environmental intelligence
        </div>
      )}

      {/* Expanded SVG diagram */}
      {expanded && (
        <div className="px-2 py-3">
          {/* Column labels */}
          <div className="grid grid-cols-3 text-center mb-1 px-1" style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Data Sources</span>
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Claude Agents</span>
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Outputs</span>
          </div>

          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="w-full"
            style={{ maxHeight: '520px' }}
            onMouseLeave={() => setHover(null)}
          >
            {/* SVG background so nodes are always visible */}
            <rect x={0} y={0} width={VW} height={VH} fill="#0f172a" />
            <defs>
              <style>{`
                .flow-path {
                  stroke-dasharray: 8 5;
                  animation: dashflow 1.2s linear infinite;
                }
                @keyframes dashflow {
                  from { stroke-dashoffset: 26; }
                  to   { stroke-dashoffset: 0; }
                }
              `}</style>
              <filter id="glow-blue">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-amber">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-purple">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* ── Connection paths: source → agent ── */}
            {SRC_TO_AGT.map((agents, si) =>
              agents.map(ai => {
                const lit = isSrcAgtLit(hover, si, ai);
                const color = TYPE_COLOR[SOURCES[si].type];
                return (
                  <path
                    key={`sa-${si}-${ai}`}
                    d={srcPath(SRC_Y[si], AGT_Y[ai])}
                    fill="none"
                    stroke={color}
                    strokeWidth={pathWidth(lit)}
                    opacity={pathOpacity(lit)}
                    className={lit ? 'flow-path' : ''}
                  />
                );
              })
            )}

            {/* ── Connection paths: agent → output ── */}
            {AGT_TO_OUT.map((outs, ai) =>
              outs.map(oi => {
                const lit = isAgtOutLit(hover, ai, oi);
                const color = AGENTS[ai].color;
                return (
                  <path
                    key={`ao-${ai}-${oi}`}
                    d={agtPath(AGT_Y[ai], OUT_Y[oi])}
                    fill="none"
                    stroke={color}
                    strokeWidth={pathWidth(lit)}
                    opacity={pathOpacity(lit)}
                    className={lit ? 'flow-path' : ''}
                  />
                );
              })
            )}

            {/* ── Source nodes ── */}
            {SOURCES.map((src, si) => {
              const lit = isSrcLit(hover, si);
              const color = TYPE_COLOR[src.type];
              const cy = SRC_Y[si];
              const op = nodeOpacity(lit);
              return (
                <g
                  key={`src-${si}`}
                  opacity={op}
                  onMouseEnter={() => setHover({ col: 'src', idx: si })}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={SRC_X}
                    y={cy - SRC_H / 2}
                    width={SRC_W}
                    height={SRC_H}
                    rx={5}
                    fill="#1e293b"
                    stroke={lit ? color : '#334155'}
                    strokeWidth={lit ? 1.5 : 1}
                  />
                  {/* type color bar on left */}
                  <rect
                    x={SRC_X}
                    y={cy - SRC_H / 2}
                    width={3}
                    height={SRC_H}
                    rx={5}
                    fill={color}
                    opacity={lit ? 1 : 0.5}
                  />
                  <text
                    x={SRC_X + 12}
                    y={cy + 4}
                    fontSize="10.5"
                    fill={lit ? '#e2e8f0' : '#94a3b8'}
                    fontFamily="ui-monospace, monospace"
                  >
                    {src.label}
                  </text>
                  {/* live status dot (if status provided) */}
                  {sourceStatus && (
                    <circle
                      cx={SRC_X + SRC_W - 8}
                      cy={cy}
                      r={3}
                      fill={sourceStatus[src.label] ? '#22c55e' : '#475569'}
                    />
                  )}
                </g>
              );
            })}

            {/* ── Agent nodes ── */}
            {AGENTS.map((agt, ai) => {
              const lit = isAgtLit(hover, ai);
              const cy = AGT_Y[ai];
              const op = nodeOpacity(lit);
              return (
                <g
                  key={`agt-${ai}`}
                  opacity={op}
                  onMouseEnter={() => setHover({ col: 'agt', idx: ai })}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={AGT_X}
                    y={cy - AGT_H / 2}
                    width={AGT_W}
                    height={AGT_H}
                    rx={6}
                    fill={lit ? agt.bg : '#1e293b'}
                    stroke={lit ? agt.color : '#475569'}
                    strokeWidth={lit ? 2 : 1}
                    filter={lit ? 'url(#glow-blue)' : undefined}
                  />
                  {/* Claude icon */}
                  <text
                    x={AGT_X + 10}
                    y={cy + 4}
                    fontSize="13"
                    fill={agt.color}
                    opacity={lit ? 1 : 0.6}
                  >
                    ◆
                  </text>
                  <text
                    x={AGT_X + 26}
                    y={cy + 4}
                    fontSize="10.5"
                    fill={lit ? '#f1f5f9' : '#94a3b8'}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fontWeight={lit ? '600' : '400'}
                  >
                    {agt.label}
                  </text>
                </g>
              );
            })}

            {/* ── Output nodes ── */}
            {OUTPUTS.map((out, oi) => {
              const lit = isOutLit(hover, oi);
              const color = AGENTS[out.agent].color;
              const cy = OUT_Y[oi];
              const op = nodeOpacity(lit);
              return (
                <g
                  key={`out-${oi}`}
                  opacity={op}
                  onMouseEnter={() => setHover({ col: 'out', idx: oi })}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={OUT_X}
                    y={cy - OUT_H / 2}
                    width={OUT_W}
                    height={OUT_H}
                    rx={5}
                    fill="#1e293b"
                    stroke={lit ? color : '#334155'}
                    strokeWidth={lit ? 1.5 : 1}
                  />
                  <text
                    x={OUT_X + 10}
                    y={cy + 4}
                    fontSize="10.5"
                    fill={lit ? '#e2e8f0' : '#94a3b8'}
                    fontFamily="ui-monospace, monospace"
                  >
                    {out.label}
                  </text>
                  {/* right accent */}
                  <rect
                    x={OUT_X + OUT_W - 3}
                    y={cy - OUT_H / 2}
                    width={3}
                    height={OUT_H}
                    rx={5}
                    fill={color}
                    opacity={lit ? 1 : 0.4}
                  />
                </g>
              );
            })}

            {/* ── Legend ── */}
            {[
              { color: TYPE_COLOR.air,    label: 'Air' },
              { color: TYPE_COLOR.water,  label: 'Water' },
              { color: TYPE_COLOR.gov,    label: 'Government' },
              { color: TYPE_COLOR.health, label: 'Health' },
            ].map((l, i) => (
              <g key={l.label} transform={`translate(${SRC_X + i * 100}, ${VH - 14})`}>
                <rect width={8} height={8} rx={2} fill={l.color} opacity={0.7} y={-6} />
                <text x={12} y={1} fontSize="9" fill="#64748b" fontFamily="ui-sans-serif, system-ui, sans-serif">
                  {l.label}
                </text>
              </g>
            ))}
          </svg>

          <p className="text-center text-[10px] text-slate-700 mt-1">
            Hover any node to trace its data connections
          </p>
        </div>
      )}
    </div>
  );
}
