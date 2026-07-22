import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function confidenceColor(value: number) {
  if (value >= 85) return 'var(--teal)';
  if (value >= 60) return 'var(--warn)';
  return 'var(--text-3)';
}

export default function ConfidenceRing({
  value,
  size = 16,
  showLabel,
  className,
}: {
  value: number; // 0..100
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const stroke = Math.max(1.5, size / 10);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = confidenceColor(value);
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-hairline)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-mono text-[9px] leading-none" style={{ color }}>
          {Math.round(value)}
        </span>
      )}
    </span>
  );
}
