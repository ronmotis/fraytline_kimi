// Load board card (exchange.md §2): fit ring, route, memory citations, governed bid CTA.
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { ExchangeLoad } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';
import { initials, moneyBand, posterMeta, useDisplayFit, LOAD_NOTES } from './exchangeData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function LoadCard({
  load,
  index,
  dimmed,
  onBid,
  onDetails,
}: {
  load: ExchangeLoad;
  index: number;
  dimmed: boolean;
  onBid: (load: ExchangeLoad) => void;
  onDetails: (load: ExchangeLoad) => void;
}) {
  const suggestPrice = useStore((s) => s.suggestPrice);
  const fit = useDisplayFit(load);
  const suggestion = suggestPrice({ from: load.from, to: load.to }, load.cargo);
  const meta = posterMeta(load.poster);
  const notes = LOAD_NOTES[load.id] ?? [];
  const placed = load.status === 'bidding' && load.ourBid;
  const lowConfidenceLane = fit.laneFact !== undefined && fit.laneFact.confidence < 60;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.24, ease: EASE }}
      className={cn(
        'flex flex-col rounded-card border border-line-hairline bg-surface-1 p-5 transition-all duration-200 hover:border-line-strong',
        dimmed && 'opacity-60 saturate-[0.8]',
      )}
    >
      {/* fit score + route */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-h3 font-semibold text-text-1">
            {load.from} <span className="text-text-3">→</span> {load.to}
          </div>
          <div className="mt-1 text-caption text-text-2">
            {load.weightT}t · {load.cargo.replace(/\s*—.*$/, '')} · {load.date} pickup
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ConfidenceRing value={fit.score} size={40} showLabel />
          <span className="text-micro uppercase text-text-3">fit</span>
        </div>
      </div>

      {/* budget band */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-data text-text-1">{moneyBand(suggestion.band, load.price)}</span>
        <span className="text-caption text-text-3">budget band</span>
        {lowConfidenceLane && (
          <span className="rounded-chip border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">
            low memory
          </span>
        )}
      </div>

      {/* poster row */}
      <div className="mt-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-surface-3 font-mono text-[11px] font-semibold text-text-2">
          {initials(load.poster)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-small text-text-1">{load.poster}</div>
          <div className="text-caption text-text-3">{meta.relation}</div>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-data text-ok">
          <Star className="h-3 w-3 fill-current" />
          {meta.rating.toFixed(1)}
        </span>
      </div>

      {/* memory citations */}
      <div className="mt-3 space-y-1.5">
        {fit.laneFact && <MemoryChip factId={fit.laneFact.id} />}
        {fit.reasons.slice(0, 2).map((r) => (
          <div key={r} className="flex items-center gap-1.5 text-caption text-teal/80">
            <span className="text-[10px]">◈</span>
            <span className="truncate">{r.replace(/^known lane ◈.*$/, 'lane match from your memory')}</span>
          </div>
        ))}
        {notes.map((n) => (
          <div
            key={n.text}
            className={cn('flex items-center gap-1.5 text-caption', n.warn ? 'text-warn' : 'text-teal/80')}
          >
            <span className="text-[10px]">◈</span>
            <span>{n.text}</span>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="mt-4 flex items-center gap-2 border-t border-line-hairline pt-3.5">
        {placed ? (
          <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-chip border border-teal/30 bg-teal-dim px-3 py-2 text-small font-medium text-teal">
            Bid placed · {fmtMoney(load.ourBid!)}
          </span>
        ) : (
          <button
            onClick={() => onBid(load)}
            className="flex-1 rounded-chip bg-ember px-3 py-2 text-small font-medium text-canvas transition-colors duration-150 hover:bg-ember-hi"
          >
            Bid — suggest {fmtMoney(suggestion.price)}
          </button>
        )}
        <button
          onClick={() => onDetails(load)}
          className="rounded-chip border border-line-hairline px-3 py-2 text-small text-text-2 transition-colors duration-150 hover:border-line-strong hover:text-text-1"
        >
          Details
        </button>
      </div>
    </motion.div>
  );
}
