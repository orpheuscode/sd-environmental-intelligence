'use client';

import { useState } from 'react';

export interface SourceItem {
  source: string;
  portalUrl: string;
  stationId?: string;
  rawValue?: string;
  fetchedAt?: string;
  meaning: string;
}

interface Props {
  items: SourceItem[];
  label?: string;
}

function FreshnessTag({ date }: { date: string }) {
  try {
    const ms = Date.now() - new Date(date).getTime();
    if (isNaN(ms)) return null;
    const days = ms / 86400000;
    const textColor =
      days < 30 ? 'text-emerald-600' : days < 365 ? 'text-amber-600' : 'text-red-500';
    const dotColor =
      days < 30 ? 'bg-emerald-500' : days < 365 ? 'bg-amber-500' : 'bg-red-500';
    const label =
      days < 1 ? 'today'
      : days < 7 ? `${Math.floor(days)}d ago`
      : days < 60 ? `${Math.floor(days / 7)}wk ago`
      : days < 365 ? `${Math.floor(days / 30)}mo ago`
      : `${Math.floor(days / 365)}y+ ago`;
    return (
      <span className={`flex items-center gap-1 ${textColor} font-mono text-xs`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        {label}
      </span>
    );
  } catch {
    return null;
  }
}

export default function SourceDisclosure({ items, label = 'Sources' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-xs transition-colors group"
      >
        <span
          className={`text-[9px] transition-transform duration-150 inline-block ${open ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
        <span className="group-hover:underline underline-offset-2">
          {label} ({items.length})
        </span>
      </button>

      {open && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-100">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <a
                  href={item.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline underline-offset-2 text-xs font-medium leading-none"
                >
                  {item.source} ↗
                </a>
                {item.fetchedAt && <FreshnessTag date={item.fetchedAt} />}
              </div>
              {item.stationId && (
                <p className="text-xs text-gray-500">
                  Station:{' '}
                  <span className="font-mono text-gray-600">{item.stationId}</span>
                </p>
              )}
              {item.rawValue && (
                <p className="text-xs text-gray-500">
                  Reading:{' '}
                  <span className="font-mono text-gray-700 font-medium">{item.rawValue}</span>
                </p>
              )}
              <p className="text-xs text-gray-500 italic">{item.meaning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
