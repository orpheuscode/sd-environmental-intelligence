'use client';

import { useState, useCallback } from 'react';
import AddressInput from '@/components/AddressInput';
import ProgressSteps from '@/components/ProgressSteps';
import ResidentReport from '@/components/ResidentReport';
import CityOpsView from '@/components/CityOpsView';
import RegulatoryScorecard from '@/components/RegulatoryScorecard';
import DataFlowViz from '@/components/DataFlowViz';
import DataSourcesTab from '@/components/DataSourcesTab';
import MediaFeed from '@/components/MediaFeed';

type Tab = 'resident' | 'city' | 'regulatory' | 'sources';

interface RiskData {
  risk_score: number;
  risk_tier: string;
  risk_color: string;
  contributing_factors: string[];
  city_recommendations: string[];
  timestamp: string;
  model_note?: string;
}

interface PipelineResult {
  address: string;
  coordinates: { lat: number; lng: number };
  raw_data: {
    risk_assessment: RiskData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  reports: {
    resident_report?: string;
    city_ops_report?: string;
    regulatory_report?: string;
  };
}

const REPORT_TABS: { key: Exclude<Tab, 'sources'>; label: string; endpoint: string }[] = [
  { key: 'resident',   label: 'Resident Report',  endpoint: '/api/report' },
  { key: 'city',       label: 'City Operations',  endpoint: '/api/city-ops' },
  { key: 'regulatory', label: 'Regulatory',        endpoint: '/api/regulatory' },
];

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: 'resident',   label: 'Resident Report' },
  { key: 'city',       label: 'City Operations' },
  { key: 'regulatory', label: 'Regulatory' },
  { key: 'sources',    label: 'Data Sources' },
];


export default function Home() {
  const [address, setAddress] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('resident');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [results, setResults] = useState<Partial<Record<Exclude<Tab, 'sources'>, PipelineResult>>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastFailedTab, setLastFailedTab] = useState<Exclude<Tab, 'sources'> | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const runTab = useCallback(async (tab: Exclude<Tab, 'sources'>, addressOverride?: string) => {
    const addr = (addressOverride ?? address).trim();
    if (!addr) return;

    setLoading(true);
    setError(null);
    setLastFailedTab(null);
    setProgressStep(0);
    setActiveTab(tab);

    const interval = setInterval(() => {
      setProgressStep(prev => Math.min(prev + 1, 5));
    }, 4000);

    try {
      const endpoint = REPORT_TABS.find(t => t.key === tab)!.endpoint;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Server error (HTTP ${res.status})`);
      }
      setResults(prev => ({ ...prev, [tab]: data }));
      setLastFetchedAt(new Date().toISOString());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      setLastFailedTab(tab);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [address]);

  const handleTabClick = (tab: Tab) => {
    if (tab === 'sources') {
      setActiveTab('sources');
      return;
    }
    setActiveTab(tab);
    if (address.trim() && !loading && !results[tab]) runTab(tab);
  };

  const currentResult = activeTab !== 'sources' ? results[activeTab] : undefined;
  const risk = currentResult?.raw_data?.risk_assessment;

  const aggregatedRawData = (() => {
    const r = results.resident ?? results.city ?? results.regulatory;
    return r?.raw_data ?? null;
  })();

  const scrollToResults = () => {
    document.getElementById('report-output')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#1e3a5f] flex items-center justify-center text-xs font-bold text-white tracking-tight">
              SD
            </div>
            <div>
              <h1 className="font-semibold text-sm text-[#1e3a5f] leading-none">
                SD Environmental Intelligence
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">
                Air · Water · Ocean · Contamination Risk
              </p>
            </div>
          </div>
          <span className="text-gray-300 text-xs hidden sm:block">Claude Impact Lab 2026</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Address input card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <AddressInput
            address={address}
            setAddress={setAddress}
            loading={loading}
            onSubmit={e => {
              e.preventDefault();
              if (activeTab !== 'sources') runTab(activeTab);
            }}
            onDemoSelect={addr => {
              if (activeTab === 'sources') runTab('resident', addr);
              else runTab(activeTab, addr);
            }}
          />
        </div>

        {/* ── Tab bar — underline style ───────────────────────────────────── */}
        <div className="bg-white rounded-t-xl border border-gray-200 shadow-sm">
          <div className="flex border-b border-gray-200 px-2">
            {ALL_TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const hasResult = tab.key !== 'sources' && !!results[tab.key as Exclude<Tab, 'sources'>];
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  disabled={loading}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f] -mb-px'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                  {hasResult && !loading && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle" />
                  )}
                  {tab.key === 'sources' && aggregatedRawData && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 align-middle" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Tab content area ──────────────────────────────────────────── */}
          <div className="p-5">

            {/* Loading — terminal only */}
            {loading && activeTab !== 'sources' && (
              <ProgressSteps step={progressStep} />
            )}

            {/* Error */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg leading-none flex-shrink-0">✕</span>
                  <div>
                    <p className="text-red-700 text-sm font-medium">Analysis failed</p>
                    <p className="text-red-500 text-xs mt-1 font-mono break-all">{error}</p>
                  </div>
                </div>
                {lastFailedTab && address.trim() && (
                  <button
                    onClick={() => runTab(lastFailedTab)}
                    className="text-xs border border-red-300 text-red-600 hover:text-red-800 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Data Sources tab */}
            {!loading && activeTab === 'sources' && (
              <DataSourcesTab rawData={aggregatedRawData} lastFetchedAt={lastFetchedAt} />
            )}

            {/* Report results */}
            <div id="report-output">
              {!loading && currentResult && activeTab !== 'sources' && (
                <div className="space-y-6">
                  {activeTab === 'resident' && currentResult.reports.resident_report && (
                    <ResidentReport
                      report={currentResult.reports.resident_report}
                      risk={risk}
                      address={currentResult.address}
                      coordinates={currentResult.coordinates}
                      rawData={currentResult.raw_data}
                    />
                  )}
                  {activeTab === 'city' && currentResult.reports.city_ops_report && (
                    <CityOpsView
                      report={currentResult.reports.city_ops_report}
                      risk={risk}
                      address={currentResult.address}
                      rawData={currentResult.raw_data}
                    />
                  )}
                  {activeTab === 'regulatory' && currentResult.reports.regulatory_report && (
                    <RegulatoryScorecard
                      report={currentResult.reports.regulatory_report}
                      rawData={currentResult.raw_data}
                    />
                  )}
                </div>
              )}

              {/* Empty state */}
              {!loading && !currentResult && !error && activeTab !== 'sources' && (
                <div className="text-center py-16 space-y-3">
                  {activeTab === 'city' && (
                    <div className="text-left mb-8">
                      <MediaFeed label="Live Local Environmental News" />
                    </div>
                  )}
                  <p className="text-gray-400 text-sm">
                    Enter a San Diego address above to generate an environmental intelligence report.
                  </p>
                  <p className="text-gray-300 text-xs">
                    Reports take 15–30s — data from {activeTab === 'resident' ? '6' : '5'} live sources + Claude AI analysis.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Data architecture flow viz ──────────────────────────────────── */}
        <DataFlowViz />

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white px-4 py-4 mt-4">
        <p className="text-gray-400 text-xs text-center max-w-4xl mx-auto">
          Data: EPA AirNow · Purple Air · City of San Diego Open Data ·
          NOAA NWS · Census Geocoder · SD County DEH ·{' '}
          <span className="text-gray-300">Built by Quintin / Spire Labs</span>
        </p>
      </footer>

    </div>
  );
}
