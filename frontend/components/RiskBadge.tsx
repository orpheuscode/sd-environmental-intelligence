interface Props {
  score: number;
  tier: string;
  color: string;
}

const colorMap: Record<string, string> = {
  critical: 'text-red-700 border-red-300 bg-red-100',
  red:      'text-red-700 border-red-300 bg-red-100',
  orange:   'text-orange-700 border-orange-300 bg-orange-100',
  amber:    'text-amber-700 border-amber-300 bg-amber-100',
  yellow:   'text-yellow-700 border-yellow-300 bg-yellow-100',
  green:    'text-emerald-700 border-emerald-300 bg-emerald-100',
};

export default function RiskBadge({ score, tier, color }: Props) {
  const styles = colorMap[color] ?? colorMap.green;
  return (
    <div className={`inline-flex items-baseline gap-2 border rounded-lg px-4 py-2 ${styles}`}>
      <span className="text-3xl font-bold tabular-nums">{score}</span>
      <span className="text-sm font-semibold opacity-90">{tier} RISK</span>
    </div>
  );
}
