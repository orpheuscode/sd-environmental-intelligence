'use client';

import { useEffect, useState, useRef } from 'react';
import type { NewsItem } from '@/app/api/news/route';

interface Props {
  label?: string;
  /** If provided, filters headlines for this keyword (neighborhood/topic) */
  filter?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  'KPBS':   'bg-blue-100 text-blue-700 border-blue-300',
  'NBC 7':  'bg-red-100 text-red-700 border-red-300',
};

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
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</h3>
      </div>

      {loading && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="flex-shrink-0 w-60 h-20 rounded-lg bg-slate-200/60 animate-pulse border border-slate-200"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[
            { title: 'KPBS — San Diego Environmental Coverage', link: 'https://www.kpbs.org', source: 'KPBS' },
            { title: 'NBC 7 San Diego — Local News', link: 'https://www.nbcsandiego.com', source: 'NBC 7' },
          ].map((item, i) => (
            <NewsCard key={i} item={{ ...item, pubDate: '' }} />
          ))}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
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
  const sourceCls = SOURCE_COLORS[item.source] ?? 'bg-slate-100 text-slate-600 border-slate-300';
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-64 border border-slate-200 rounded-lg p-3 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors group space-y-2 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sourceCls}`}>
          {item.source}
        </span>
        {item.pubDate && (
          <span className="text-[10px] text-slate-400">{timeAgo(item.pubDate)}</span>
        )}
      </div>
      <p className="text-xs text-slate-700 leading-snug line-clamp-3 group-hover:text-slate-900 transition-colors">
        {item.title}
      </p>
    </a>
  );
}
