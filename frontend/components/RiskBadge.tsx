interface Props {
  score: number;
  tier: string;
  color: string;
}

const colorMap: Record<string, string> = {
  critical: 'text-red-200 border-red-500 bg-red-900/80',
  red:      'text-red-400 border-red-800 bg-red-950/50',
  orange:   'text-orange-400 border-orange-800 bg-orange-950/50',
  amber:    'text-amber-400 border-amber-800 bg-amber-950/50',
  yellow:   'text-yellow-400 border-yellow-800 bg-yellow-950/50',
  green:    'text-emerald-400 border-emerald-800 bg-emerald-950/50',
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
