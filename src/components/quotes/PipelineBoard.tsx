import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fmtMoney } from '@/store';
import type { Quote, Role } from '@/store';
import { cn } from '@/lib/utils';
import QuoteCard from './QuoteCard';
import { COLUMNS, statusToCol } from './quoteUtils';
import type { ColKey, QuoteOverride } from './quoteUtils';

/**
 * Pipeline board (quotes.md §1): Draft → Sent → Negotiating → Won → Lost.
 * Framer Motion drag with lift; drop target column highlights teal hairline.
 */
export default function PipelineBoard({
  quotes,
  overrides,
  role,
  convertedMap,
  onOpenQuote,
  onDropQuote,
}: {
  quotes: Quote[];
  overrides: Record<string, QuoteOverride>;
  role: Role;
  convertedMap: Record<string, string>;
  onOpenQuote: (quote: Quote) => void;
  onDropQuote: (quote: Quote, col: ColKey) => void;
}) {
  const colRefs = useRef<Partial<Record<ColKey, HTMLDivElement | null>>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<ColKey | null>(null);
  const [sortBy, setSortBy] = useState<'age' | 'value'>('age');
  const readOnly = role === 'Dispatcher';

  const byCol = useMemo(() => {
    const map: Record<ColKey, Quote[]> = { draft: [], sent: [], negotiating: [], won: [], lost: [] };
    for (const q of quotes) {
      const col = overrides[q.id]?.col ?? statusToCol(q.status);
      map[col].push(q);
    }
    if (sortBy === 'value') {
      (Object.keys(map) as ColKey[]).forEach((k) => map[k].sort((a, b) => b.price.amount - a.price.amount));
    }
    return map;
  }, [quotes, overrides, sortBy]);

  const hitTest = (point: { x: number; y: number }): ColKey | null => {
    for (const c of COLUMNS) {
      const el = colRefs.current[c.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) return c.key;
    }
    return null;
  };

  const finance = role === 'Finance';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-micro uppercase text-text-3">
          Pipeline · drag cards between columns{readOnly ? ' (read-only as Dispatcher)' : ''}
        </div>
        <button
          onClick={() => setSortBy((s) => (s === 'age' ? 'value' : 'age'))}
          className="rounded-chip border border-line-hairline px-2 py-1 text-micro uppercase text-text-3 transition-colors hover:border-line-strong hover:text-text-1"
        >
          sort: {sortBy}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col, ci) => {
          const list = byCol[col.key];
          const total = list.reduce((sum, q) => sum + q.price.amount, 0);
          const weighted = list.reduce((sum, q) => sum + (q.price.amount * q.winProbability) / 100, 0);
          const currency = list[0]?.price.currency ?? 'USD';
          const highlighted = hoverCol === col.key && dragId !== null;
          return (
            <motion.div
              key={col.key}
              ref={(el) => { colRefs.current[col.key] = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'min-h-[220px] rounded-panel border bg-surface-1/60 p-3 transition-colors duration-150',
                highlighted ? 'border-teal/60 shadow-glow-teal' : 'border-line-hairline',
              )}
            >
              <div className="mb-3 flex items-baseline justify-between gap-2 px-1">
                <span className="text-micro uppercase text-text-3">
                  {col.label} <span className="text-text-2">({list.length})</span>
                </span>
                {list.length > 0 && (
                  <span className="font-mono text-[11px] text-text-2">
                    {fmtMoney({ amount: total, currency })}
                    {finance && (
                      <span className="ml-1.5 text-teal" title="Weighted pipeline · Σ price × win-probability">
                        · w {fmtMoney({ amount: Math.round(weighted), currency })}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                <AnimatePresence>
                  {list.map((q, i) => (
                    <QuoteCard
                      key={q.id}
                      quote={q}
                      override={overrides[q.id]}
                      index={i}
                      convertedId={convertedMap[q.id]}
                      draggable={!readOnly && q.status !== 'won' && overrides[q.id]?.col !== 'lost'}
                      onOpen={() => onOpenQuote(q)}
                      onDragStart={() => setDragId(q.id)}
                      onDrag={(point) => setHoverCol(hitTest(point))}
                      onDragEnd={(point) => {
                        const target = hitTest(point);
                        setDragId(null);
                        setHoverCol(null);
                        if (target && target !== (overrides[q.id]?.col ?? statusToCol(q.status))) {
                          onDropQuote(q, target);
                        }
                      }}
                    />
                  ))}
                </AnimatePresence>
                {list.length === 0 && (
                  <div className={cn(
                    'flex h-20 items-center justify-center rounded-card border border-dashed text-caption transition-colors',
                    highlighted ? 'border-teal/50 text-teal' : 'border-line-hairline text-text-3',
                  )}>
                    drop here
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
