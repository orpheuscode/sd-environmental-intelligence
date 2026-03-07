import { NextRequest, NextResponse } from 'next/server';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
}

const RSS_SOURCES = [
  { name: 'KPBS',         url: 'https://www.kpbs.org/rss/news/', fallback: 'https://www.kpbs.org' },
  { name: 'NBC 7',        url: 'https://www.nbcsandiego.com/feed/', fallback: 'https://www.nbcsandiego.com' },
];

function parseRSS(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const item = match[1];
    // Title — handles CDATA
    const title = item
      .match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]
      ?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    // Link — try <link> text node first, then Atom-style href
    const link =
      item.match(/<link>(https?:\/\/[\s\S]*?)<\/link>/)?.[1]?.trim() ||
      item.match(/<link[^>]+href="(https?:\/\/[^"]+)"/)?.[1]?.trim();
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const desc = item
      .match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
      ?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
      .slice(0, 160);

    if (title && link) {
      items.push({ title, link, pubDate, source: sourceName, description: desc });
    }
  }
  return items;
}

const ENV_KEYWORDS = [
  'water', 'air', 'environment', 'pollution', 'beach', 'tijuana', 'sewage',
  'wildfire', 'smoke', 'flood', 'climate', 'drought', 'contamination',
  'advisory', 'closure', 'quality', 'bacteria', 'toxic', 'rain', 'storm',
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter')?.toLowerCase();

  const allItems: NewsItem[] = [];
  const fallbackItems: NewsItem[] = [];

  await Promise.allSettled(
    RSS_SOURCES.map(async ({ name, url, fallback }) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SDEnvIntelligence/1.0' },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const items = parseRSS(xml, name);
        allItems.push(...items);
      } catch {
        // Push fallback static headline if RSS fails
        fallbackItems.push({
          title: `${name} — San Diego Environmental News`,
          link: fallback,
          pubDate: new Date().toISOString(),
          source: name,
        });
      }
    })
  );

  let items = allItems.length > 0 ? allItems : fallbackItems;

  // If filter provided (neighborhood keyword), filter to env-relevant items containing the keyword
  // Otherwise filter to env-relevant items only
  if (filter) {
    const filterWords = filter.split(/[,\s]+/).filter(Boolean);
    items = items.filter(item => {
      const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
      return (
        filterWords.some(w => text.includes(w)) ||
        ENV_KEYWORDS.some(kw => text.includes(kw))
      );
    });
  } else {
    // Default: env-relevant only
    items = items.filter(item => {
      const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
      return ENV_KEYWORDS.some(kw => text.includes(kw));
    });
  }

  // Sort by date descending, limit to 12
  items.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return NextResponse.json({ items: items.slice(0, 12) });
}
