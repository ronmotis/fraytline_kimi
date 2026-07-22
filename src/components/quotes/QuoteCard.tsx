import { motion } from 'framer-motion';
import { Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { fmtMoney } from '@/store';
import type { Quote } from '@/store';
import MemoryChip from '@/components/MemoryChip';
import ConfidenceRing from '@/components/ConfidenceRing';
import { trgb, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { QuoteOverride } from './quoteUtils';

/** Pipeline kanban card (quotes.md §1) — draggable, per-column status extras, win-probability ring. */
export default function QuoteCard({
  quote,
  override,
  index,
  convertedId,
  draggable,
  onOpen,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  quote: Quote;
  override?: QuoteOverride;
  index: number;
  convertedId?: string;
  draggable: boolean;
  onOpen: () => void;
  onDragStart?: () => void;
  onDrag?: (point: { x: number; y: number }) => void;
  onDragEnd?: (point: { x: number; y: number }) => void;
}) {
  useTheme(); // refresh drag glow color on theme flip
  const navigate = useNavigate();
  const col = override?.col;
  const marginTone = quote.marginPct >= 12 ? 'text-ok' : 'text-danger';

  return (
    <motion.div
      layoutId={`quote-${quote.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      drag={draggable}
      dragSnapToOrigin
      dragElastic={0.12}
      whileDrag={draggable ? { scale: 1.03, boxShadow: `0 0 24px ${trgb('--ember-rgb', 0.25)}`, zIndex: 60 } : undefined}
      onDragStart={onDragStart}
      onDrag={(_, info) => onDrag?.(info.point)}
      onDragEnd={(_, info) => onDragEnd?.(info.point)}
      onClick={onOpen}
      className={cn(
        'relative cursor-pointer rounded-card border border-line-hairline bg-surface-1 p-4 text-left',
        'transition-colors duration-150 hover:border-line-strong',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-data text-text-2">{quote.id}</span>
        <span className={cn('rounded-chip border px-1.5 py-0.5 text-micro uppercase', col === 'negotiating' ? 'border-warn/40 bg-warn/10 text-warn' : col === 'lost' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line-hairline text-text-3')}>
          {col === 'negotiating' ? 'counter' : col === 'lost' ? 'lost' : quote.status}
        </span>
      </div>

      <div className="mt-1 font-display text-h3 text-text-1">
        {quote.from} <span className="text-text-3">→</span> {quote.to}
      </div>
      <div className="mt-0.5 truncate text-caption text-text-2">
        {quote.customer} · {quote.weightT}t · {quote.cargo.split('—')[0].trim()}
        {quote.pickupDate ? ` · ${quote.pickupDate} pickup` : ''}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-data text-text-1">{fmtMoney(quote.price)}</span>
        {quote.memoryFactId ? (
          <MemoryChip factId={quote.memoryFactId} />
        ) : (
          <span className="rounded-chip border border-line-hairline px-1.5 py-0.5 text-[10px] text-text-3">no lane memory</span>
        )}
        <span className={cn('rounded-chip bg-ok/10 px-1.5 py-0.5 font-mono text-[10px]', marginTone)}>
          +{quote.marginPct}%
        </span>
      </div>

      {/* per-column status extras */}
      {(quote.status === 'sent' || quote.status === 'opened') && col !== 'negotiating' && (
        <div className={cn('mt-2 flex items-center gap-1.5 text-caption', quote.openCount > 0 && !quote.lastActivity?.includes('just now') ? 'text-warn' : 'text-text-2')}>
          <Eye className="h-3.5 w-3.5" />
          {quote.openCount > 0 ? `opened ${quote.openCount}×` : 'not opened yet'}
          {quote.lastActivity ? ` · ${quote.lastActivity.replace(/^Opened \d× ·\s*/, '')}` : ''}
        </div>
      )}
      {col === 'negotiating' && override?.counter !== undefined && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-chip border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">
          {fmtMoney({ amount: override.counter, currency: quote.price.currency })} offered
        </div>
      )}
      {quote.status === 'won' && convertedId && (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/movements/${convertedId}`); }}
          className="mt-2 flex items-center gap-1 text-caption text-teal transition-colors hover:text-text-1"
        >
          converted → {convertedId} <ArrowRight className="h-3 w-3" />
        </button>
      )}
      {col === 'lost' && (
        <div className="mt-2 inline-flex rounded-chip border border-danger/40 bg-danger/10 px-2 py-0.5 text-[11px] text-danger">
          {override?.reason === 'price' ? 'price − competitor' : override?.reason ?? 'price − competitor'}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line-hairline pt-2.5">
        <span className="text-[10px] uppercase tracking-[0.09em] text-text-3">win probability</span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-text-2">{Math.round(quote.winProbability)}%</span>
          <ConfidenceRing value={quote.winProbability} size={20} />
        </span>
      </div>
    </motion.div>
  );
}
