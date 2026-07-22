import { useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTenantFacts } from '@/store';
import type { MemoryFact } from '@/store';
import FactCard from './FactCard';
import { tintStyle } from './tints';
import EmptyState from '@/components/EmptyState';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StreamTab = 'All' | 'Lanes' | 'Customers' | 'Partners' | 'Habits' | 'Pending';

const TAB_KINDS: Record<Exclude<StreamTab, 'All' | 'Pending'>, MemoryFact['kind'][]> = {
  Lanes: ['lane', 'border'],
  Customers: ['customer'],
  Partners: ['partner'],
  Habits: ['pattern', 'pricing', 'rule'],
};

export default function FactStream({
  tab,
  onTab,
  query,
  onQuery,
  highlightId,
  onTeach,
}: {
  tab: StreamTab;
  onTab: (t: StreamTab) => void;
  query: string;
  onQuery: (q: string) => void;
  highlightId: string | null;
  onTeach: (prefill: string) => void;
}) {
  const facts = useTenantFacts();

  const counts = useMemo(() => {
    const c: Record<StreamTab, number> = {
      All: facts.length,
      Lanes: 0,
      Customers: 0,
      Partners: 0,
      Habits: 0,
      Pending: 0,
    };
    facts.forEach((f) => {
      if (f.status === 'unreviewed') c.Pending += 1;
      (Object.keys(TAB_KINDS) as (keyof typeof TAB_KINDS)[]).forEach((t) => {
        if (TAB_KINDS[t].includes(f.kind)) c[t] += 1;
      });
    });
    return c;
  }, [facts]);

  const visible = useMemo(() => {
    let list = facts;
    if (tab === 'Pending') list = list.filter((f) => f.status === 'unreviewed');
    else if (tab !== 'All') list = list.filter((f) => TAB_KINDS[tab].includes(f.kind));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (f) => f.label.toLowerCase().includes(q) || f.evidence.some((e) => e.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [facts, tab, query]);

  // learning-feed click → scroll the fact into view (FLIP pulse handled by FactCard)
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`fact-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, tab, query]);

  const tabs: StreamTab[] = ['All', 'Lanes', 'Customers', 'Partners', 'Habits', 'Pending'];

  return (
    <div className="flex h-full flex-col rounded-panel border border-line-hairline bg-surface-1">
      <div className="flex flex-wrap items-center gap-1 border-b border-line-hairline px-3 py-2.5">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-caption transition-colors duration-150',
              tab === t ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
            )}
          >
            {t}
            <span
              className={cn(
                'rounded-full px-1.5 font-mono text-[9px]',
                t === 'Pending' && counts.Pending > 0
                  ? 'bg-ember text-canvas'
                  : 'bg-surface-2 text-text-3',
              )}
            >
              {counts[t]}
            </span>
          </button>
        ))}
        {query && (
          <button
            onClick={() => onQuery('')}
            style={tintStyle('teal')}
            className="ml-auto flex items-center gap-1 rounded-chip border px-2 py-1 text-caption text-teal"
          >
            “{query}” <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="max-h-[560px] flex-1 overflow-y-auto p-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={Brain}
            title={tab === 'Pending' ? 'Nothing awaiting review' : 'No facts here yet'}
            body={
              tab === 'Pending'
                ? 'Every new pattern I notice will pause here for your confirmation first.'
                : 'Teach me something above, or let me learn from your next few jobs.'
            }
          />
        ) : (
          <div key={`${tab}-${query}`}>
            <AnimatePresence initial={false}>
              {visible.map((f, i) => (
                <FactCard key={f.id} fact={f} index={i} highlight={highlightId === f.id} onTeach={onTeach} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
