import RiskBadge from './RiskBadge';
import StyledReport from './StyledReport';
import SourceDisclosure, { type SourceItem } from './SourceDisclosure';

interface RiskData {
  risk_score: number;
  risk_tier: string;
  risk_color: string;
  contributing_factors: string[];
  city_recommendations: string[];
  timestamp: string;
}

interface Props {
  report: string;
  risk?: RiskData;
  address: string;
  coordinates: { lat: number; lng: number };
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
function buildAirSources(rawData: Record<string, any>): SourceItem[] {
  const items: SourceItem[] = [];
  const airnow = rawData?.air_quality?.airnow_official;
  if (airnow && !airnow.error) {
    const r = airnow.readings?.[0];
    items.push({
      source: 'EPA AirNow — Official Monitoring',
      portalUrl: 'https://www.airnowapi.org/',
      stationId: r?.reporting_area ?? 'San Diego region',
      rawValue: r ? `AQI ${r.aqi} (${r.parameter})` : undefined,
      fetchedAt: r?.date_observed ? `${r.date_observed}T${String(r.hour_observed ?? 0).padStart(2, '0')}:00:00` : undefined,
      meaning: 'Official EPA air quality index from the nearest government monitoring station.',
    });
  }
  const pa = rawData?.air_quality?.purple_air_hyperlocal;
  if (pa && !pa.error) {
    const s = pa.nearest_sensors?.[0];
    items.push({
      source: 'Purple Air — Community Sensors',
      portalUrl: 'https://www.purpleair.com/map',
      stationId: s?.name ?? `${pa.sensor_count ?? 0} sensors nearby`,
      rawValue: s ? `PM2.5 ${s['pm2.5'] ?? s.pm2_5 ?? 'n/a'} µg/m³` : undefined,
      meaning: 'Hyperlocal PM2.5 from community-operated sensors within 0.15° of the address.',
    });
  }
  return items;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWaterSources(rawData: Record<string, any>): SourceItem[] {
  const items: SourceItem[] = [];
  const chem = rawData?.drinking_water?.chemical_parameters;
  if (chem && !chem.error) {
    const rows = chem.data ?? [];
    const row = rows[rows.length - 1];
    items.push({
      source: 'SD Public Utilities — Chemical Parameters',
      portalUrl: 'https://data.sandiego.gov/datasets/water-quality-distribution-system/',
      stationId: row?.sample_source ?? row?.sample_id,
      rawValue: row ? `${row.analyte}: ${row.analyte_value} ${row.value_units ?? ''}`.trim() : undefined,
      fetchedAt: latestDate(rows, 'date_sample'),
      meaning: 'Fluoride, color, and turbidity measured in the water distribution system.',
    });
  }
  const bact = rawData?.drinking_water?.bacteria;
  if (bact && !bact.error) {
    const rows = bact.data ?? [];
    const row = rows[rows.length - 1];
    items.push({
      source: 'SD Public Utilities — Indicator Bacteria',
      portalUrl: 'https://data.sandiego.gov/datasets/water-quality-bacteria/',
      stationId: row?.sample_id ?? row?.FR_NUM,
      rawValue: row ? `T.coliform: ${row.t_coliform ?? 'n/a'}, E.coli: ${row.e_coli ?? 'n/a'}` : undefined,
      fetchedAt: latestDate(rows, 'date_sampled'),
      meaning: 'Total coliform and E. coli MCL compliance in tap water (latest readings).',
    });
  }
  const eff = rawData?.drinking_water?.plant_effluent;
  if (eff && !eff.error) {
    const rows = eff.data ?? [];
    const row = rows[rows.length - 1];
    items.push({
      source: 'SD Public Utilities — Plant Effluent',
      portalUrl: 'https://data.sandiego.gov/datasets/water-quality-plant-effluent/',
      stationId: row?.sample_source ?? row?.sample_id,
      rawValue: row ? `${row.analyte}: ${row.analyte_value} ${row.value_units ?? ''}`.trim() : undefined,
      fetchedAt: latestDate(rows, 'date_sample'),
      meaning: 'Lead, hardness, and fluoride in treatment plant output before entering distribution.',
    });
  }
  return items;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildOceanSources(rawData: Record<string, any>): SourceItem[] {
  const items: SourceItem[] = [];
  const bact = rawData?.ocean_water?.ocean_bacteria;
  if (bact && !bact.error) {
    const rows = bact.data ?? [];
    const row = rows[rows.length - 1];
    items.push({
      source: 'SD Ocean Water Quality — Bacteria',
      portalUrl: 'https://data.sandiego.gov/datasets/ocean-water-quality/',
      stationId: row?.station ?? row?.sample,
      rawValue: row ? `${row.parameter}: ${row.value} ${row.units ?? ''}`.trim() : undefined,
      fetchedAt: latestDate(rows, 'date_sample'),
      meaning: 'Fecal indicator bacteria (fecal coliform, enterococcus) at coastal monitoring stations.',
    });
  }
  const rtoms = rawData?.ocean_water?.rtoms_water_quality;
  if (rtoms && !rtoms.error) {
    const rows = rtoms.data ?? [];
    const row = rows[rows.length - 1];
    items.push({
      source: 'RTOMS — Real-Time Ocean Monitoring',
      portalUrl: 'https://data.sandiego.gov/datasets/ocean-water-quality-rtoms/',
      stationId: row?.project,
      rawValue: row ? `${row.parameter}: ${row.value} ${row.units ?? ''}`.trim() : undefined,
      fetchedAt: latestDate(rows, 'datetime_pst'),
      meaning: 'Continuous ocean quality sensors at PLOO and SBOO outfall stations.',
    });
  }
  return items;
}

export default function ResidentReport({ report, risk, address, coordinates, rawData }: Props) {
  const airSources   = rawData ? buildAirSources(rawData)   : [];
  const waterSources = rawData ? buildWaterSources(rawData) : [];
  const oceanSources = rawData ? buildOceanSources(rawData) : [];

  const riskSources: SourceItem[] = risk ? [{
    source: 'SD Environmental Intelligence — Risk Score',
    portalUrl: 'https://data.sandiego.gov/',
    rawValue: `${risk.risk_score}/100 (${risk.risk_tier})`,
    fetchedAt: risk.timestamp,
    meaning: 'Composite contamination risk derived from precipitation, bacteria, and coastal proximity.',
  }] : [];

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div>
          <p className="text-gray-900 text-xs font-medium mb-1">{address}</p>
          <p className="text-gray-600 text-xs">
            {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
          </p>
        </div>
        {risk && (
          <RiskBadge score={risk.risk_score} tier={risk.risk_tier} color={risk.risk_color} />
        )}
      </div>

      {/* Contributing factors */}
      {risk && risk.contributing_factors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {risk.contributing_factors.map((f, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full text-gray-700"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Agent report — light card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <StyledReport content={report} theme="light" />
      </div>

      {/* Source disclosures */}
      {rawData && (airSources.length > 0 || waterSources.length > 0 || oceanSources.length > 0) && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Data Attribution</p>
          {airSources.length > 0 && (
            <SourceDisclosure items={airSources} label="Air Quality Sources" />
          )}
          {waterSources.length > 0 && (
            <SourceDisclosure items={waterSources} label="Drinking Water Sources" />
          )}
          {oceanSources.length > 0 && (
            <SourceDisclosure items={oceanSources} label="Ocean & Coastal Sources" />
          )}
          {riskSources.length > 0 && (
            <SourceDisclosure items={riskSources} label="Risk Score Derivation" />
          )}
        </div>
      )}
    </div>
  );
}
