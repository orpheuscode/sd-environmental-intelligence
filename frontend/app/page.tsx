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
import {
  ResidentReportSkeleton,
  CityOpsViewSkeleton,
  RegulatoryScorecardSkeleton,
} from '@/components/TabSkeleton';

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

const TAB_SKELETONS: Record<Exclude<Tab, 'sources'>, React.ReactNode> = {
  resident:   <ResidentReportSkeleton />,
  city:       <CityOpsViewSkeleton />,
  regulatory: <RegulatoryScorecardSkeleton />,
};

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
    if (address.trim() && !loading) runTab(tab);
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
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">
              SD
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-none">SD Environmental Intelligence</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Air · Water · Ocean · Contamination Risk
              </p>
            </div>
          </div>
          <span className="text-slate-500 text-xs hidden sm:block">Claude Impact Lab 2026</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">

        {/* 1. Address input */}
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

        {/* 2. Tab bar */}
        <div className="flex flex-wrap gap-2">
          {REPORT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {tab.label}
              {results[tab.key] && !loading && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle" />
              )}
            </button>
          ))}

          <button
            onClick={() => handleTabClick('sources')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === 'sources'
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Data Sources
            {aggregatedRawData && (
              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 align-middle" />
            )}
          </button>
        </div>

        {/* 3. Loading — progress + skip anchor + skeleton */}
        {loading && activeTab !== 'sources' && (
          <div className="space-y-4">
            <ProgressSteps step={progressStep} />
            <div className="text-center">
              <button
                onClick={scrollToResults}
                className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 px-4 py-1.5 rounded-full transition-colors"
              >
                Skip to results ↓
              </button>
            </div>
            {TAB_SKELETONS[activeTab as Exclude<Tab, 'sources'>]}
          </div>
        )}

        {/* 4. Report output anchor */}
        <div id="report-output">

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-950/50 border border-red-900 rounded-xl px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-lg leading-none flex-shrink-0">✕</span>
                <div>
                  <p className="text-red-300 text-sm font-medium">Analysis failed</p>
                  <p className="text-red-400/70 text-xs mt-1 font-mono break-all">{error}</p>
                </div>
              </div>
              {lastFailedTab && address.trim() && (
                <button
                  onClick={() => runTab(lastFailedTab)}
                  className="text-xs border border-red-800 text-red-400 hover:text-red-200 hover:border-red-600 px-3 py-1.5 rounded-lg transition-colors"
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
            <div className="text-center py-20 space-y-4">
              {/* Pre-analysis media feed */}
              {activeTab === 'city' && (
                <div className="text-left mb-8">
                  <MediaFeed label="Live Local Environmental News" />
                </div>
              )}
              <p className="text-slate-500 text-sm">
                Enter a San Diego address above to generate an environmental intelligence report.
              </p>
              <p className="text-slate-600 text-xs">
                Reports take 15–30s — data from {activeTab === 'resident' ? '6' : '5'} live sources + Claude AI analysis.
              </p>
            </div>
          )}

        </div>{/* end #report-output */}

        {/* 5. Data Architecture flow viz — always at bottom */}
        <DataFlowViz />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-4">
        <p className="text-slate-600 text-xs text-center max-w-4xl mx-auto">
          Data: EPA AirNow · Purple Air · City of San Diego Open Data ·
          NOAA NWS · Census Geocoder · SD County DEH ·{' '}
          <span className="text-slate-500">Built by Quintin / Spire Labs</span>
        </p>
      </footer>
    </div>
  );
}
