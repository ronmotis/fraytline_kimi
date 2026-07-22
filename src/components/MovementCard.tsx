import { useNavigate } from 'react-router';
import { fmtMoney } from '@/store';
import type { Movement } from '@/store';
import StatusPill from './StatusPill';
import MemoryChip from './MemoryChip';
import { cn } from '@/lib/utils';

/** Compact movement card (§9.6) — lists, boards, dock. Click → movement detail. */
export default function MovementCard({
  movement,
  memoryFactId,
  className,
}: {
  movement: Movement;
  memoryFactId?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const marginTone = movement.margin && movement.margin.amount < 0 ? 'text-danger' : 'text-ok';
  return (
    <button
      onClick={() => navigate(`/movements/${movement.id}`)}
      className={cn(
        'block w-full rounded-card border border-line-hairline bg-surface-1 p-4 text-left',
        'transition-all duration-150 hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-data text-text-2">{movement.id}</span>
        <StatusPill status={movement.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 font-display text-h3 text-text-1">
        {movement.from} <span className="text-text-3">→</span> {movement.to}
        {movement.flags.map((f) => (
          <span key={f} className="rounded border border-line-hairline px-1 py-px font-mono text-[9px] text-text-3">{f}</span>
        ))}
      </div>
      <div className="mt-1 truncate text-caption text-text-2">
        {movement.customer} · {movement.cargo}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-data text-text-3">
          {movement.nextMilestone ?? '—'}
          {movement.nextMilestoneInH !== undefined && (
            <span className="text-text-2"> · {movement.nextMilestoneInH}h</span>
          )}
        </span>
        {movement.margin && (
          <span className={cn('font-mono text-data', marginTone)}>{fmtMoney(movement.margin)}</span>
        )}
      </div>
      {movement.exceptionNote && (
        <div className="mt-2 flex items-center gap-1.5 text-caption text-danger">
          <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse-dot" />
          {movement.exceptionNote}
        </div>
      )}
      {memoryFactId && <div className="mt-2"><MemoryChip factId={memoryFactId} /></div>}
    </button>
  );
}
