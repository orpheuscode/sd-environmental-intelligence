'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// ── Section accent colors keyed to heading content ─────────────────────────

type AccentStyle = { border: string; bg: string; label: string };

const SECTION_ACCENTS_DARK: Array<{ keywords: string[]; style: AccentStyle }> = [
  {
    keywords: ['air', 'aqi', 'pollutant', 'pm2.5', 'ozone', 'particulate'],
    style: { border: 'border-l-green-500', bg: 'bg-green-950/20', label: 'text-green-300' },
  },
  {
    keywords: ['drinking water', 'tap water', 'lead', 'fluoride', 'turbidity', 'chlorine', 'distribution'],
    style: { border: 'border-l-blue-500', bg: 'bg-blue-950/20', label: 'text-blue-300' },
  },
  {
    keywords: ['ocean', 'coastal', 'beach', 'tijuana', 'marine', 'surf', 'tidal', 'bacteria', 'fecal', 'enterococcus'],
    style: { border: 'border-l-cyan-500', bg: 'bg-cyan-950/20', label: 'text-cyan-300' },
  },
  {
    keywords: ['health', 'impact', 'symptom', 'respiratory', 'skin', 'cognitive', 'sleep', 'organ', 'children'],
    style: { border: 'border-l-purple-500', bg: 'bg-purple-950/20', label: 'text-purple-300' },
  },
  {
    keywords: ['action', 'checklist', 'recommendation', 'filter', 'step', 'protect', 'what you can do'],
    style: { border: 'border-l-amber-500', bg: 'bg-amber-950/20', label: 'text-amber-300' },
  },
  {
    keywords: ['regulatory', 'regulation', 'compliance', 'scorecard', 'wins', 'accountability', 'law', 'policy', 'ordinance'],
    style: { border: 'border-l-orange-500', bg: 'bg-orange-950/20', label: 'text-orange-300' },
  },
  {
    keywords: ['resource', 'deploy', 'operations', 'city', 'recommendation', 'timeline', 'allocation'],
    style: { border: 'border-l-amber-500', bg: 'bg-amber-950/20', label: 'text-amber-300' },
  },
];

const SECTION_ACCENTS_LIGHT: Array<{ keywords: string[]; style: AccentStyle }> = [
  {
    keywords: ['air', 'aqi', 'pollutant', 'pm2.5', 'ozone', 'particulate'],
    style: { border: 'border-l-green-500', bg: '', label: '' },
  },
  {
    keywords: ['drinking water', 'tap water', 'lead', 'fluoride', 'turbidity', 'chlorine', 'distribution'],
    style: { border: 'border-l-blue-500', bg: '', label: '' },
  },
  {
    keywords: ['ocean', 'coastal', 'beach', 'tijuana', 'marine', 'surf', 'tidal', 'bacteria', 'fecal', 'enterococcus'],
    style: { border: 'border-l-cyan-500', bg: '', label: '' },
  },
  {
    keywords: ['health', 'impact', 'symptom', 'respiratory', 'skin', 'cognitive', 'sleep', 'organ', 'children'],
    style: { border: 'border-l-purple-500', bg: '', label: '' },
  },
  {
    keywords: ['action', 'checklist', 'recommendation', 'filter', 'step', 'protect', 'what you can do'],
    style: { border: 'border-l-amber-500', bg: '', label: '' },
  },
  {
    keywords: ['regulatory', 'regulation', 'compliance', 'scorecard', 'wins', 'accountability', 'law', 'policy', 'ordinance'],
    style: { border: 'border-l-orange-500', bg: '', label: '' },
  },
  {
    keywords: ['resource', 'deploy', 'operations', 'city', 'recommendation', 'timeline', 'allocation'],
    style: { border: 'border-l-amber-500', bg: '', label: '' },
  },
];

function accentForHeading(text: string, light: boolean): AccentStyle {
  const lower = text.toLowerCase();
  const accents = light ? SECTION_ACCENTS_LIGHT : SECTION_ACCENTS_DARK;
  for (const { keywords, style } of accents) {
    if (keywords.some(kw => lower.includes(kw))) return style;
  }
  return light
    ? { border: 'border-l-slate-400', bg: '', label: '' }
    : { border: 'border-l-slate-600', bg: 'bg-slate-800/20', label: 'text-slate-300' };
}

// ── Status badge detection ─────────────────────────────────────────────────

const STATUS_BADGE_DARK: Record<string, string> = {
  'EXCEEDED':             'bg-blue-900/70 text-blue-200 border border-blue-600',
  'COMPLIANT':            'bg-emerald-900/70 text-emerald-200 border border-emerald-600',
  'MET':                  'bg-emerald-900/70 text-emerald-200 border border-emerald-600',
  'IN PROGRESS':          'bg-amber-900/70 text-amber-200 border border-amber-600',
  'MONITORING':           'bg-amber-900/70 text-amber-200 border border-amber-600',
  'IMPROVING':            'bg-blue-900/70 text-blue-200 border border-blue-600',
  'STABLE':               'bg-slate-700/70 text-slate-200 border border-slate-500',
  'ELEVATED':             'bg-orange-900/70 text-orange-200 border border-orange-600',
  'ADVISORY IN EFFECT':   'bg-orange-900/70 text-orange-200 border border-orange-600',
  'CAUTION':              'bg-amber-900/70 text-amber-200 border border-amber-600',
  'BELOW STANDARDS':      'bg-red-900/60 text-red-200 border border-red-700',
  'HEALTH ADVISORY':      'bg-red-900/60 text-red-200 border border-red-700',
  'DECLINING':            'bg-red-900/60 text-red-200 border border-red-700',
  'NOT MET':              'bg-red-900/60 text-red-200 border border-red-700',
  'MISSED':               'bg-red-900/60 text-red-200 border border-red-700',
  'FAILED':               'bg-red-900/60 text-red-200 border border-red-700',
  'CRITICAL':             'bg-red-900/90 text-red-100 border border-red-500 font-bold',
  'PENDING DATA':         'bg-slate-700/70 text-slate-300 border border-slate-500',
};

const PILL = 'font-semibold px-3 py-1 rounded-full text-sm';
const STATUS_BADGE_LIGHT: Record<string, string> = {
  'EXCEEDED':             `bg-green-100 text-green-800 ${PILL}`,
  'COMPLIANT':            `bg-green-100 text-green-800 ${PILL}`,
  'MET':                  `bg-green-100 text-green-800 ${PILL}`,
  'LOW':                  `bg-green-100 text-green-800 ${PILL}`,
  'GOOD':                 `bg-green-100 text-green-800 ${PILL}`,
  'IN PROGRESS':          `bg-amber-100 text-amber-800 ${PILL}`,
  'MONITORING':           `bg-amber-100 text-amber-800 ${PILL}`,
  'MODERATE':             `bg-amber-100 text-amber-800 ${PILL}`,
  'CAUTION':              `bg-amber-100 text-amber-800 ${PILL}`,
  'IMPROVING':            `bg-blue-100 text-blue-800 ${PILL}`,
  'STABLE':               `bg-slate-100 text-slate-700 ${PILL}`,
  'ELEVATED':             `bg-orange-100 text-orange-800 ${PILL}`,
  'HIGH':                 `bg-orange-100 text-orange-800 ${PILL}`,
  'ADVISORY IN EFFECT':   `bg-orange-100 text-orange-800 ${PILL}`,
  'HIGH ADVISORY':        `bg-orange-100 text-orange-800 ${PILL}`,
  'BELOW STANDARDS':      `bg-red-100 text-red-800 ${PILL}`,
  'HEALTH ADVISORY':      `bg-red-100 text-red-800 ${PILL}`,
  'DECLINING':            `bg-red-100 text-red-800 ${PILL}`,
  'NOT MET':              `bg-red-100 text-red-800 ${PILL}`,
  'MISSED':               `bg-red-100 text-red-800 ${PILL}`,
  'FAILED':               `bg-red-100 text-red-800 ${PILL}`,
  'CRITICAL':             `bg-red-100 text-red-800 ${PILL}`,
  'DANGER':               `bg-red-100 text-red-800 ${PILL}`,
  'PENDING DATA':         `bg-slate-100 text-slate-600 ${PILL}`,
  'PENDING':              `bg-slate-100 text-slate-600 ${PILL}`,
};

// Extract text content from ReactMarkdown children
function childText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(c => childText(c as React.ReactNode)).join('');
  return '';
}

// ── Custom renderers ───────────────────────────────────────────────────────

function makeComponents(light: boolean, explainButton?: (title: string) => React.ReactNode): Components {
  const badges = light ? STATUS_BADGE_LIGHT : STATUS_BADGE_DARK;
  return {
    h2: ({ children }) => {
      const text = childText(children);
      const { border } = accentForHeading(text, light);
      if (light) {
        return (
          <div className={`border-l-4 ${border} pl-4 mt-8 mb-3 pb-2 border-b border-slate-100`}>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {children}
            </h2>
            {explainButton && explainButton(text)}
          </div>
        );
      }
      const { bg, label } = accentForHeading(text, false);
      return (
        <div className={`border-l-4 ${border} ${bg} pl-4 pr-3 py-2.5 rounded-r mt-7 mb-3 -mx-1`}>
          <h2 className={`text-sm font-bold uppercase tracking-wider ${label} leading-snug`}>
            {children}
          </h2>
          {explainButton && explainButton(text)}
        </div>
      );
    },

    h3: ({ children }) => {
      const text = childText(children);
      const { border } = accentForHeading(text, light);
      if (light) {
        return (
          <div className={`border-l-2 ${border} pl-3 mt-6 mb-2`}>
            <h3 className="text-base font-semibold text-slate-800">
              {children}
            </h3>
            {explainButton && explainButton(text)}
          </div>
        );
      }
      const { label } = accentForHeading(text, false);
      return (
        <div className={`border-l-2 ${border} pl-3 mt-5 mb-2`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${label}`}>
            {children}
          </h3>
          {explainButton && explainButton(text)}
        </div>
      );
    },

    strong: ({ children }) => {
      const text = childText(children).trim();
      // Status badge — exact match
      const badgeClass = badges[text];
      if (badgeClass) {
        return (
          <span className={`inline-block ${badgeClass} align-middle mx-0.5`}>
            {text}
          </span>
        );
      }
      // Numeric value with units — e.g. "AQI: 37", "Total coliform: >16,000 CFU/100mL"
      if (light && /\d/.test(text) && text.length < 80) {
        return <span className="text-2xl font-black text-gray-900 leading-none">{text}</span>;
      }
      return <strong className={light ? 'text-gray-900 font-semibold' : 'text-white font-semibold'}>{children}</strong>;
    },

    p: ({ children }) => (
      <p className={light ? 'text-gray-800 text-base leading-relaxed mb-3' : 'text-slate-300 leading-relaxed mb-4 text-[15px]'}>{children}</p>
    ),

    ul: ({ children }) => (
      <ul className="space-y-2 mb-4 pl-0 list-none">{children}</ul>
    ),

    ol: ({ children }) => (
      <ol className="space-y-2 mb-4 pl-0 list-none counter-reset-item">{children}</ol>
    ),

    li: ({ children }) => (
      light ? (
        <div className="flex gap-3 items-start py-2 border-b border-gray-100">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="text-gray-800 text-base leading-relaxed">{children}</span>
        </div>
      ) : (
        <li className="text-slate-300 leading-relaxed text-[15px]">{children}</li>
      )
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={light
          ? 'text-blue-600 hover:text-blue-800 underline underline-offset-2'
          : 'text-blue-400 hover:text-blue-300 underline underline-offset-2'}
      >
        {children}{light ? ' ↗' : ''}
      </a>
    ),

    td: ({ children }) => (
      <td className={`${light ? 'text-slate-700 border border-slate-200' : 'text-slate-300 border border-slate-700'} px-3 py-2`}>
        {children}
      </td>
    ),
    th: ({ children }) => (
      <th className={`${light ? 'text-slate-900 border border-slate-200 bg-slate-100' : 'text-slate-200 border border-slate-600 bg-slate-800/50'} px-3 py-2 font-semibold text-left text-[13px] uppercase tracking-wide`}>
        {children}
      </th>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className={`w-full border-collapse text-sm ${light ? 'border border-slate-200' : 'border border-slate-700'}`}>
          {children}
        </table>
      </div>
    ),
  };
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  content: string;
  theme?: 'dark' | 'light';
  /** Optional: adds an "Explain" button below each h2/h3. Receives heading text. */
  explainButton?: (title: string) => React.ReactNode;
}

export default function StyledReport({ content, theme = 'dark', explainButton }: Props) {
  const light = theme === 'light';
  return (
    <div className={`styled-report space-y-6 ${light ? 'text-gray-900' : 'text-slate-300'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={makeComponents(light, explainButton)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
