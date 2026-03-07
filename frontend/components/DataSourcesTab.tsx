'use client';

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type TabBadge = 'resident' | 'city' | 'regulatory';

interface SourceDef {
  id: string;
  name: string;
  category: string;
  description: string;
  feeds: TabBadge[];
  portalUrl: string;
  updateFrequency: string;
  /** dot-path into rawData to find this source's data, e.g. "drinking_water.bacteria" */
  rawDataPath?: string;
  /** field name in the rows that holds a date, for freshness calc */
  dateField?: string;
}

// ── Static catalog ─────────────────────────────────────────────────────────

const CATALOG: SourceDef[] = [
  // Air Quality
  {
    id: 'airnow',
    name: 'EPA AirNow',
    category: 'Air Quality',
    description: 'Official AQI, PM2.5, and ozone readings from EPA monitoring stations near the queried address.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://www.airnow.gov',
    updateFrequency: 'Hourly',
    rawDataPath: 'air_quality.airnow_official',
    dateField: 'date_observed',
  },
  {
    id: 'purpleair',
    name: 'Purple Air',
    category: 'Air Quality',
    description: 'Hyperlocal community air quality sensors providing PM2.5 and AQI within 0.15° of the address.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://www2.purpleair.com/pages/map',
    updateFrequency: 'Real-time (~2min)',
    rawDataPath: 'air_quality.purple_air_hyperlocal',
  },

  // Drinking Water
  {
    id: 'dw_chem',
    name: 'SD Drinking Water — Chemical Parameters',
    category: 'Drinking Water',
    description: 'Fluoride, color, and turbidity levels measured across the SD water distribution system.',
    feeds: ['resident', 'city', 'regulatory'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Monthly',
    rawDataPath: 'drinking_water.chemical_parameters',
    dateField: 'date_sample',
  },
  {
    id: 'dw_bact',
    name: 'SD Drinking Water — Bacteria',
    category: 'Drinking Water',
    description: 'Total coliform, E. coli, and MCL compliance data from indicator bacteria monitoring.',
    feeds: ['resident', 'city', 'regulatory'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Weekly (latest readings)',
    rawDataPath: 'drinking_water.bacteria',
    dateField: 'date_sampled',
  },
  {
    id: 'dw_effluent',
    name: 'SD Drinking Water — Plant Effluent',
    category: 'Drinking Water',
    description: 'Lead, hardness, alkalinity, and fluoride in treatment plant effluent before distribution.',
    feeds: ['resident', 'regulatory'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Monthly',
    rawDataPath: 'drinking_water.plant_effluent',
    dateField: 'date_sample',
  },
  {
    id: 'dw_sites',
    name: 'SD Drinking Water — Sample Sites',
    category: 'Drinking Water',
    description: 'Geographic locations of all water quality monitoring sites; used to geo-match data to address.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Static (infrastructure)',
    rawDataPath: 'drinking_water.sample_sites',
  },

  // Ocean & Beach
  {
    id: 'ocean_bact',
    name: 'SD Ocean Water Quality',
    category: 'Ocean & Beach',
    description: 'Fecal coliform and enterococcus bacteria levels at SD coastal monitoring stations (2020–present).',
    feeds: ['resident', 'city'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Weekly',
    rawDataPath: 'ocean_water.ocean_bacteria',
    dateField: 'date_sample',
  },
  {
    id: 'rtoms_wq',
    name: 'RTOMS — Real-Time Ocean Monitoring',
    category: 'Ocean & Beach',
    description: 'Continuous ocean water quality readings from PLOO and SBOO outfall stations: BOD, chlorophyll, turbidity.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Continuous (15-min intervals)',
    rawDataPath: 'ocean_water.rtoms_water_quality',
    dateField: 'datetime_pst',
  },
  {
    id: 'rtoms_chem',
    name: 'RTOMS — Ocean Chemistry',
    category: 'Ocean & Beach',
    description: 'Dissolved oxygen, pH, nitrate, and CO₂ from RTOMS ocean chemistry sensors at PLOO and SBOO.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://data.sandiego.gov/datasets/',
    updateFrequency: 'Continuous (15-min intervals)',
    rawDataPath: 'ocean_water.rtoms_ocean_chemistry',
    dateField: 'datetime_pst',
  },
  {
    id: 'beach_closures',
    name: 'SD County Beach Closures (DEH)',
    category: 'Ocean & Beach',
    description: 'Active and historical beach closure and advisory records from SD County Environmental Health.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://www.sandiegocounty.gov/content/sdc/deh/water/beach.html',
    updateFrequency: 'As-needed (event driven)',
    rawDataPath: 'ocean_water.beach_closures',
  },

  // Environmental Flow
  {
    id: 'noaa',
    name: 'NOAA NWS — Precipitation',
    category: 'Environmental Flow',
    description: '7-day precipitation forecast and recent rainfall totals from the San Diego NWS forecast office.',
    feeds: ['resident', 'city'],
    portalUrl: 'https://www.weather.gov/sgx/',
    updateFrequency: 'Hourly (forecast)',
    rawDataPath: 'precipitation',
  },
  {
    id: 'ibwc',
    name: 'IBWC — Tijuana River',
    category: 'Environmental Flow',
    description: 'International Boundary & Water Commission data for TJ River flow and sewage contamination events.',
    feeds: ['resident', 'city', 'regulatory'],
    portalUrl: 'https://www.ibwc.gov/water-data/',
    updateFrequency: 'Daily',
    rawDataPath: 'ocean_water.ibwc_tijuana_river',
  },
  {
    id: 'geocoder',
    name: 'Census Geocoder',
    category: 'Environmental Flow',
    description: 'Converts any US address to lat/lng coordinates used to geo-match all data sources. No API key required.',
    feeds: ['resident', 'city', 'regulatory'],
    portalUrl: 'https://geocoding.geo.census.gov',
    updateFrequency: 'Static (address database)',
  },

  // Health Outcomes
  {
    id: 'cdc_places',
    name: 'CDC PLACES',
    category: 'Health Outcomes',
    description: 'Census-tract level health outcome data: asthma prevalence, COPD, heart disease, by San Diego zip code.',
    feeds: ['resident', 'regulatory'],
    portalUrl: 'https://www.cdc.gov/places/',
    updateFrequency: 'Annual',
  },

  // Regulatory & Government
  {
    id: 'muni_code',
    name: 'SD Municipal Code',
    category: 'Regulatory & Government',
    description: 'San Diego municipal environmental ordinances; scraped to identify active regulations and stated targets.',
    feeds: ['regulatory'],
    portalUrl: 'https://www.sandiego.gov/city-clerk/officialdocs/municipal-code',
    updateFrequency: 'As amended',
    rawDataPath: 'regulatory',
  },
  {
    id: 'council_res',
    name: 'SD Council Resolutions (Granicus)',
    category: 'Regulatory & Government',
    description: 'City council resolution archive with environmental commitments tracked against monitoring outcomes.',
    feeds: ['regulatory'],
    portalUrl: 'https://sandiego.granicus.com',
    updateFrequency: 'Per council session',
    rawDataPath: 'regulatory',
  },
];

const CATEGORIES = [
  'Air Quality',
  'Drinking Water',
  'Ocean & Beach',
  'Environmental Flow',
  'Health Outcomes',
  'Regulatory & Government',
];

const TAB_COLORS: Record<TabBadge, string> = {
  resident:   'bg-blue-900/50 text-blue-300 border border-blue-800',
  city:       'bg-amber-900/50 text-amber-300 border border-amber-800',
  regulatory: 'bg-purple-900/50 text-purple-300 border border-purple-800',
};

const TAB_LABELS: Record<TabBadge, string> = {
  resident:   'Resident',
  city:       'City Ops',
  regulatory: 'Regulatory',
};

// ── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.readings && Array.isArray(data.readings)) return data.readings;
  if (data.nearest_sites && Array.isArray(data.nearest_sites)) return data.nearest_sites;
  if (data.nearest_sensors && Array.isArray(data.nearest_sensors)) return data.nearest_sensors;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findLatestDate(rows: any[], dateField: string): string | null {
  const dates = rows
    .map(r => r?.[dateField])
    .filter(Boolean)
    .map(d => new Date(d).getTime())
    .filter(t => !isNaN(t));
  if (!dates.length) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function FreshnessChip({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-600 text-xs">unknown</span>;
  try {
    const days = (Date.now() - new Date(date).getTime()) / 86400000;
    if (isNaN(days)) return null;
    const color = days < 30 ? 'text-emerald-400' : days < 365 ? 'text-amber-400' : 'text-red-400';
    const dot   = days < 30 ? 'bg-emerald-500' : days < 365 ? 'bg-amber-500' : 'bg-red-500';
    const label =
      days < 1 ? 'today'
      : days < 7 ? `${Math.floor(days)}d ago`
      : days < 60 ? `${Math.floor(days / 7)}wk ago`
      : days < 365 ? `${Math.floor(days / 30)}mo ago`
      : `${Math.floor(days / 365)}y+ ago`;
    return (
      <span className={`flex items-center gap-1 text-xs ${color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </span>
    );
  } catch { return null; }
}

// ── Card component ─────────────────────────────────────────────────────────

interface CardProps {
  src: SourceDef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData: Record<string, any> | null;
}

function SourceCard({ src, rawData }: CardProps) {
  const [expanded, setExpanded] = useState(false);

  const sourceData = src.rawDataPath && rawData
    ? getNestedValue(rawData, src.rawDataPath)
    : null;

  const rows = extractRows(sourceData);
  const hasError = sourceData && !Array.isArray(sourceData) && sourceData?.error;
  const rowCount = rows.length;

  const latestDate = src.dateField && rows.length
    ? findLatestDate(rows, src.dateField)
    : null;

  // Build a small preview table (last 3 rows, first 4 columns)
  const previewRows = rows.slice(-3);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewCols = previewRows.length > 0 ? Object.keys(previewRows[0] as Record<string, any>).slice(0, 4) : [];

  const isLive = rowCount > 0 && !hasError;

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${isLive ? 'border-slate-700 bg-slate-800/30' : hasError ? 'border-red-900/40 bg-red-950/10' : 'border-slate-800 bg-slate-900/30'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isLive ? 'bg-emerald-500' : hasError ? 'bg-red-500' : 'bg-slate-600'}`} />
          <div>
            <a
              href={src.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-slate-200 hover:text-blue-400 transition-colors leading-tight"
            >
              {src.name} ↗
            </a>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{src.description}</p>
          </div>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2">
        {src.feeds.map(f => (
          <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TAB_COLORS[f]}`}>
            {TAB_LABELS[f]}
          </span>
        ))}
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs text-slate-600">Updates: {src.updateFrequency}</span>
        {latestDate && (
          <>
            <span className="text-xs text-slate-600">·</span>
            <FreshnessChip date={latestDate} />
          </>
        )}
        {rowCount > 0 && (
          <>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-600">{rowCount} rows fetched</span>
          </>
        )}
        {hasError && (
          <span className="text-xs text-red-400">Error: {String(sourceData.error).slice(0, 60)}</span>
        )}
      </div>

      {/* Raw data expandable */}
      {(previewRows.length > 0 || hasError) && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <span className={`text-[9px] transition-transform duration-150 inline-block ${expanded ? 'rotate-90' : ''}`}>▶</span>
            View raw data
          </button>

          {expanded && (
            <div className="mt-2 overflow-x-auto">
              {hasError ? (
                <pre className="text-xs text-red-400 bg-red-950/30 rounded p-2 font-mono">
                  {JSON.stringify(sourceData, null, 2).slice(0, 400)}
                </pre>
              ) : previewCols.length > 0 ? (
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr>
                      {previewCols.map(col => (
                        <th
                          key={col}
                          className="text-left text-slate-500 font-mono font-normal border-b border-slate-800 pb-1 pr-4 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri}>
                        {previewCols.map(col => (
                          <td
                            key={col}
                            className="text-slate-400 font-mono pr-4 py-0.5 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis"
                          >
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {String((row as Record<string, any>)[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <pre className="text-xs text-slate-500 bg-slate-900 rounded p-2 font-mono overflow-x-auto max-h-32">
                  {JSON.stringify(sourceData, null, 2).slice(0, 500)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Not yet fetched */}
      {!rawData && (
        <p className="text-xs text-slate-700 italic">Run an analysis to see live data from this source.</p>
      )}
    </div>
  );
}

// ── Main tab component ─────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData: Record<string, any> | null;
  lastFetchedAt?: string | null;
}

export default function DataSourcesTab({ rawData, lastFetchedAt }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const totalSources = CATALOG.length;
  const liveCount = rawData
    ? CATALOG.filter(s => {
        const d = s.rawDataPath ? getNestedValue(rawData, s.rawDataPath) : null;
        return d && !d.error && extractRows(d).length > 0;
      }).length
    : 0;

  const filteredCatalog = activeCategory
    ? CATALOG.filter(s => s.category === activeCategory)
    : CATALOG;

  return (
    <div className="space-y-6">
      {/* Aggregate stats bar */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl px-5 py-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-slate-300">
            <span className="text-white font-semibold">{totalSources}</span> data sources catalogued
          </span>
          {rawData && (
            <span className="text-slate-300">
              <span className={`font-semibold ${liveCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{liveCount}</span> returned live data
            </span>
          )}
          {lastFetchedAt && (
            <span className="text-slate-500">
              Last refresh: <span className="text-slate-400 font-mono text-xs">{new Date(lastFetchedAt).toLocaleString()}</span>
            </span>
          )}
          {!rawData && (
            <span className="text-slate-600 text-sm">Run an analysis above to see live data from each source.</span>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            activeCategory === null
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(c => c === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              activeCategory === cat
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Source cards by category */}
      {CATEGORIES.filter(c => !activeCategory || c === activeCategory).map(cat => {
        const sources = filteredCatalog.filter(s => s.category === cat);
        if (!sources.length) return null;
        return (
          <div key={cat} className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-medium border-b border-slate-800 pb-2">
              {cat}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sources.map(src => (
                <SourceCard key={src.id} src={src} rawData={rawData} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
