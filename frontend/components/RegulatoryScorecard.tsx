'use client';

import { useState, useCallback } from 'react';
import StyledReport from './StyledReport';
import SourceDisclosure, { type SourceItem } from './SourceDisclosure';

interface Props {
  report: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: Record<string, any> | null;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Parse status counts from the report markdown ───────────────────────────

interface StatusCounts {
  exceeded: number;
  met: number;
  inProgress: number;
  missed: number;
  pending: number;
}

function parseStatusCounts(report: string): StatusCounts {
  return {
    exceeded:   (report.match(/✅\s*EXCEEDED/g) ?? []).length,
    met:        (report.match(/✓\s*MET|☑\s*MET/g) ?? []).length,
    inProgress: (report.match(/⚠\s*IN PROGRESS|⏳\s*IN PROGRESS/g) ?? []).length,
    missed:     (report.match(/❌\s*MISSED|❌\s*NOT MET/g) ?? []).length,
    pending:    (report.match(/⏳\s*PENDING/g) ?? []).length,
  };
}

// ── Inline explain panel ───────────────────────────────────────────────────

function ExplainButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const explain = useCallback(async () => {
    if (text) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: title }),
      });
      if (!res.ok || !res.body) { setText('Explanation unavailable.'); setLoading(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
    } catch {
      setText('Could not load explanation — check API connection.');
    } finally {
      setLoading(false);
    }
  }, [title, text]);

  return (
    <div className="mt-2">
      <button
        onClick={explain}
        className="text-[10px] text-gray-500 hover:text-blue-600 border border-gray-300 hover:border-blue-400 px-2 py-0.5 rounded transition-colors"
      >
        {open ? 'Hide' : 'Explain significance ◆'}
      </button>
      {open && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
          {loading && !text && (
            <span className="animate-pulse text-gray-400">Asking Claude...</span>
          )}
          {text && <span>{text}</span>}
          {loading && text && <span className="animate-pulse ml-1 text-blue-500">▌</span>}
        </div>
      )}
    </div>
  );
}

// ── Cross-reference links ──────────────────────────────────────────────────

const CROSS_REFS = [
  {
    label: 'EPA Beach Water Quality Standards',
    url: 'https://www.epa.gov/beaches/designated-beach-water-quality-standards',
    keywords: ['beach', 'bacteria', 'ocean', 'enterococcus', 'fecal'],
  },
  {
    label: 'EPA Lead & Copper Rule',
    url: 'https://www.epa.gov/dwreginfo/lead-and-copper-rule',
    keywords: ['lead', 'copper', 'drinking water', 'service line'],
  },
  {
    label: 'EPA National Ambient Air Quality Standards (NAAQS)',
    url: 'https://www.epa.gov/naaqs',
    keywords: ['air', 'pm2.5', 'ozone', 'pollutant', 'purifier'],
  },
];

function CrossRefs({ report }: { report: string }) {
  const lower = report.toLowerCase();
  const relevant = CROSS_REFS.filter(r =>
    r.keywords.some(kw => lower.includes(kw))
  );
  if (!relevant.length) return null;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-1">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Federal Standards Referenced</p>
      {relevant.map(r => (
        <a
          key={r.url}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
        >
          {r.label} ↗
        </a>
      ))}
    </div>
  );
}

// ── Source items ───────────────────────────────────────────────────────────

const REGULATORY_SOURCES: SourceItem[] = [
  {
    source: 'SD Municipal Code — Environmental Ordinances',
    portalUrl: 'https://www.sandiego.gov/city-clerk/officialdocs/municipal-code',
    meaning: 'Active municipal environmental regulations and stated compliance targets.',
  },
  {
    source: 'SD City Council Resolutions (Granicus)',
    portalUrl: 'https://sandiego.granicus.com',
    meaning: 'Archived council resolutions with environmental commitments tracked against monitoring data.',
  },
  {
    source: 'SD Public Utilities — Chemical Parameters',
    portalUrl: 'https://data.sandiego.gov/datasets/',
    meaning: 'Distribution system chemistry used to assess regulatory compliance with water quality targets.',
  },
  {
    source: 'IBWC — Tijuana River Data',
    portalUrl: 'https://www.ibwc.gov/water-data/',
    meaning: 'TJ River flow and contamination data tied to SD–Mexico cross-border regulatory commitments.',
  },
  {
    source: 'CDC PLACES — Health Outcomes by Census Tract',
    portalUrl: 'https://www.cdc.gov/places/',
    meaning: 'Asthma and respiratory health outcome rates used to evaluate effectiveness of air quality regulations.',
  },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function RegulatoryScorecard({ report, rawData }: Props) {
  const counts = parseStatusCounts(report);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const enrichedSources: SourceItem[] = REGULATORY_SOURCES.map(s => {
    if (s.source.includes('Chemical Parameters') && rawData) {
      const rows: Record<string, string>[] = rawData?.drinking_water?.chemical_parameters?.data ?? [];
      const dates = rows.map(r => r?.date_sample).filter(Boolean).map(d => new Date(d).getTime()).filter(t => !isNaN(t));
      return dates.length ? { ...s, fetchedAt: new Date(Math.max(...dates)).toISOString() } : s;
    }
    return s;
  });

  const explainButton = useCallback((title: string) => {
    if (title.length < 8) return null;
    return <ExplainButton title={title} />;
  }, []);

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Status summary bar */}
        {total > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {counts.exceeded > 0 && (
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-300">
                ✅ {counts.exceeded} Exceeded
              </span>
            )}
            {counts.met > 0 && (
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                ✓ {counts.met} Met
              </span>
            )}
            {counts.inProgress > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                ⚠ {counts.inProgress} In Progress
              </span>
            )}
            {counts.missed > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-300">
                ❌ {counts.missed} Missed
              </span>
            )}
            {counts.pending > 0 && (
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                ⏳ {counts.pending} Pending
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <a
            href="https://sandiego.granicus.com/search/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            Search Council Archive ↗
          </a>
          <button
            onClick={() => copyToClipboard(report)}
            className="text-xs border border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Copy for campaign use
          </button>
        </div>
      </div>

      {/* Full regulatory report — light card with explain buttons */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <StyledReport content={report} theme="light" explainButton={explainButton} />
      </div>

      {/* Federal cross-references */}
      <CrossRefs report={report} />

      {/* Source disclosures */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Data Attribution</p>
        <SourceDisclosure items={enrichedSources} label="Regulatory & Compliance Sources" />
      </div>
    </div>
  );
}
