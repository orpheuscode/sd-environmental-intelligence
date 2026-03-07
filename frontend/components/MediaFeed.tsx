'use client';

import { useEffect, useState, useRef } from 'react';
import type { NewsItem } from '@/app/api/news/route';

interface Props {
  label?: string;
  /** If provided, filters headlines for this keyword (neighborhood/topic) */
  filter?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  'KPBS':        'bg-blue-100 text-blue-700 border-blue-300',
  'NBC 7':       'bg-red-100 text-red-700 border-red-300',
  'Voice of SD': 'bg-purple-100 text-purple-700 border-purple-300',
};

const FALLBACK_ITEMS = [
  { title: 'Environmental coverage — air, water, and ocean quality in San Diego', link: 'https://www.kpbs.org/environment', source: 'KPBS', pubDate: '', description: 'Local public radio covering San Diego environmental issues.' },
  { title: 'San Diego environmental and climate news', link: 'https://www.nbcsandiego.com/tag/environment/', source: 'NBC 7', pubDate: '', description: 'Local TV news covering weather, water, and environmental alerts.' },
  { title: 'Environment and water policy investigations', link: 'https://voiceofsandiego.org/topics/environment/', source: 'Voice of SD', pubDate: '', description: 'Nonprofit investigative journalism on SD water and environmental policy.' },
];

function timeAgo(pubDate: string): string {
  try {
    const ms = Date.now() - new Date(pubDate).getTime();
    if (isNaN(ms) || ms < 0) return '';
    const hours = ms / 3600000;
    if (hours < 1) return `${Math.floor(ms / 60000)}m ago`;
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch { return ''; }
}

export default function MediaFeed({ label = 'Live Local Environmental News', filter }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const url = filter
      ? `/api/news?filter=${encodeURIComponent(filter)}`
      : '/api/news';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setItems(data.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [filter]);

  if (!loading && !error && items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</h3>
      </div>

      {loading && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="flex-shrink-0 w-72 h-32 rounded-lg bg-gray-200/60 animate-pulse border border-gray-200"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {FALLBACK_ITEMS.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
        >
          {items.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sourceCls = SOURCE_COLORS[item.source] ?? 'bg-gray-100 text-gray-600 border-gray-300';
  const ago = item.pubDate ? timeAgo(item.pubDate) : '';
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-72 border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors group flex flex-col gap-2 shadow-sm"
    >
      {/* Header: source badge + timestamp */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${sourceCls}`}>
          {item.source}
        </span>
        {ago && (
          <span className="text-[11px] text-gray-400 flex-shrink-0">{ago}</span>
        )}
      </div>

      {/* Headline */}
      <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-gray-900 transition-colors">
        {item.title}
      </p>

      {/* Description snippet */}
      {item.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {item.description}
        </p>
      )}

      {/* CTA */}
      <span className="mt-auto text-xs font-medium text-blue-600 group-hover:text-blue-800 transition-colors">
        Read ↗
      </span>
    </a>
  );
}
