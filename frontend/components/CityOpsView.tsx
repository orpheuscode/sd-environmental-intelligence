import RiskBadge from './RiskBadge';
import StyledReport from './StyledReport';
import MediaFeed from './MediaFeed';
import SourceDisclosure, { type SourceItem } from './SourceDisclosure';

interface RiskData {
  risk_score: number;
  risk_tier: string;
  risk_color: string;
  contributing_factors: string[];
  city_recommendations: string[];
  timestamp: string;
  model_note?: string;
}

interface Props {
  report: string;
  risk?: RiskData;
  address?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: Record<string, any> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function latestDate(rows: any[], field: string): string | undefined {
  if (!rows?.length) return undefined;
  const dates = rows.map(r => r?.[field]).filter(Boolean).map(d => new Date(d).getTime()).filter(t => !isNaN(t));
  return dates.length ? new Date(Math.max(...dates)).toISOString() : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCityOpsSources(rawData: Record<string, any>, risk?: RiskData): SourceItem[] {
  const items: SourceItem[] = [];

  if (risk) {
    items.push({
      source: 'SD Environmental Intelligence — Contamination Risk Model',
      portalUrl: 'https://data.sandiego.gov/',
      rawValue: `Score: ${risk.risk_score}/100 · ${risk.risk_tier} risk`,
      fetchedAt: risk.timestamp,
      meaning: 'Composite 0–100 risk score derived from rainfall, proximity to TJ outflow, and coastal bacteria levels.',
    });
  }

  const precip = rawData?.precipitation;
  if (precip && !precip.error) {
    items.push({
      source: 'NOAA NWS — San Diego Forecast Office',
      portalUrl: 'https://www.weather.gov/sgx/',
      rawValue: precip.forecast_office ?? precip.grid_id ?? 'SGX grid',
      fetchedAt: precip.generated_at ?? precip.updated_at,
      meaning: '7-day precipitation forecast and recent rainfall totals used to calculate runoff contamination risk.',
    });
  }

  const ocean = rawData?.ocean_water?.ocean_bacteria;
  if (ocean && !ocean.error) {
    const rows = ocean.data ?? [];
    const row = rows[rows.length - 1];
    items.push({
      source: 'SD Ocean Water Quality — Bacteria (2020–present)',
      portalUrl: 'https://data.sandiego.gov/datasets/ocean-water-quality/',
      stationId: row?.station,
      rawValue: row ? `${row.parameter}: ${row.value} ${row.units ?? ''}`.trim() : undefined,
      fetchedAt: latestDate(rows, 'date_sample'),
      meaning: 'Coastal bacteria levels at SD monitoring stations driving beach advisory recommendations.',
    });
  }

  const bact = rawData?.drinking_water?.bacteria;
  if (bact && !bact.error) {
    const rows = bact.data ?? [];
    items.push({
      source: 'SD Public Utilities — Indicator Bacteria',
      portalUrl: 'https://data.sandiego.gov/datasets/water-quality-bacteria/',
      fetchedAt: latestDate(rows, 'date_sampled'),
      meaning: 'Distribution system bacteria readings factored into the overall contamination risk score.',
    });
  }

  return items;
}

// Extract neighborhood from address string (first comma-separated part after number)
function neighborhoodFromAddress(address?: string): string {
  if (!address) return 'San Diego';
  // "800 Seacoast Dr, Imperial Beach, CA" → "Imperial Beach"
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : 'San Diego';
}

export default function CityOpsView({ report, risk, address, rawData }: Props) {
  const neighborhood = neighborhoodFromAddress(address);
  const sources = rawData ? buildCityOpsSources(rawData, risk) : [];

  return (
    <div className="space-y-5">
      {/* Risk score + recommendations panel */}
      {risk && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Score */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Contamination Risk</p>
            <RiskBadge score={risk.risk_score} tier={risk.risk_tier} color={risk.risk_color} />
            {risk.timestamp && (
              <p className="text-slate-600 text-xs mt-3">
                {new Date(risk.timestamp).toLocaleString()}
              </p>
            )}
            {risk.model_note && (
              <p className="text-amber-600 text-xs mt-2">{risk.model_note}</p>
            )}
            {sources.length > 0 && (
              <SourceDisclosure items={sources} label="Risk inputs" />
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Immediate Actions</p>
            <ol className="space-y-2">
              {risk.city_recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-slate-200">{r}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Contributing factors */}
      {risk && risk.contributing_factors.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Risk Factors</p>
          <div className="flex flex-wrap gap-2">
            {risk.contributing_factors.map((f, i) => (
              <span
                key={i}
                className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-slate-300"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live news feed — neighborhood-filtered */}
      <MediaFeed
        label={`News: ${neighborhood}`}
        filter={neighborhood}
      />

      {/* Full ops briefing — light card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <StyledReport content={report} theme="light" />
      </div>

      {/* Press release links */}
      <div className="flex flex-wrap gap-3 text-xs">
        <a
          href="https://www.sandiego.gov/mayor/news"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          SD Mayor Press Releases ↗
        </a>
        <a
          href="https://www.sandiego.gov/city-clerk/officialdocs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          SD City Official Documents ↗
        </a>
      </div>
    </div>
  );
}
