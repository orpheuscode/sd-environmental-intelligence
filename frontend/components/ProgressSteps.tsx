'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { label: 'geocode',  detail: 'Census Geocoder API' },
  { label: 'fetch',    detail: 'EPA AirNow + Purple Air sensors' },
  { label: 'fetch',    detail: 'SD Socrata drinking water' },
  { label: 'fetch',    detail: 'ocean bacteria + NOAA precip grid' },
  { label: 'compute',  detail: 'contamination risk score' },
  { label: 'analyze',  detail: 'Claude Sonnet 4 agent' },
];

export default function ProgressSteps({ step }: { step: number }) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ border: '1px solid #333333', borderRadius: 12 }}>
      {/* Title bar */}
      <div
        style={{
          background: '#1C1C1C',
          borderBottom: '1px solid #333333',
          borderRadius: '12px 12px 0 0',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontFamily: "Consolas, 'Courier New', monospace", fontSize: 13, color: '#ffffff' }}>
          sd-env-intelligence
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: "Consolas, 'Courier New', monospace", fontSize: 12, color: '#888' }}>
          {blink ? '_' : ' '}
        </span>
      </div>

      {/* Log lines */}
      <div style={{ background: '#0C0C0C', padding: '16px 20px', minHeight: 200 }}>
        {STEPS.map((s, i) => {
          const done    = i < step;
          const active  = i === step;
          const pending = i > step;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                padding: '5px 0',
                opacity: pending ? 0.2 : 1,
                fontFamily: "Consolas, 'Courier New', monospace",
                fontSize: 13,
              }}
            >
              {/* prompt */}
              <span style={{ color: '#888', flexShrink: 0 }}>{'>'}</span>

              {/* verb */}
              <span style={{
                flexShrink: 0,
                minWidth: 72,
                color: done ? '#6A9955' : active ? '#DCDCAA' : '#555',
                fontWeight: 600,
              }}>
                {s.label}
              </span>

              {/* detail */}
              <span style={{ color: done ? '#6A9955' : active ? '#D4D4D4' : '#444' }}>
                {s.detail}
              </span>

              {/* status */}
              <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                {done   && <span style={{ color: '#4EC9B0' }}>ok</span>}
                {active && <span style={{ color: '#DCDCAA' }}>{blink ? '▌' : ' '}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
