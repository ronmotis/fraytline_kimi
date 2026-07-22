import { cn } from '@/lib/utils';
import type { MovementStatus } from '@/store';

const STYLES: Record<MovementStatus, { text: string; bg: string; border: string; live?: boolean; dashed?: boolean; flat?: boolean }> = {
  Draft: { text: 'text-text-3', bg: 'bg-transparent', border: 'border-text-3/50', dashed: true },
  Quoted: { text: 'text-quote', bg: 'bg-transparent', border: 'border-quote/50' },
  Booked: { text: 'text-teal', bg: 'bg-teal-dim', border: 'border-teal/30' },
  'In Transit': { text: 'text-ember', bg: 'bg-ember-dim', border: 'border-ember/30', live: true },
  'At Border': { text: 'text-warn', bg: 'bg-warn/10', border: 'border-warn/30', live: true },
  Exception: { text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', live: true },
  Delivered: { text: 'text-ok', bg: 'bg-ok/10', border: 'border-ok/30' },
  Settled: { text: 'text-text-3', bg: 'bg-transparent', border: 'border-transparent', flat: true },
};

export default function StatusPill({ status, className }: { status: MovementStatus; className?: string }) {
  const s = STYLES[status] ?? STYLES.Draft;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-micro uppercase',
        s.text, s.bg, s.border, s.dashed && 'border-dashed', s.flat && 'border-transparent', className,
      )}
    >
      {s.live && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />}
      {status}
    </span>
  );
}
