import { motion } from 'framer-motion';
import { useTenantFacts } from '@/store';
import type { FactSource } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import { tintStyle } from './tints';
import type { TintTone } from './tints';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const EVENT_CHIP: Record<FactSource, { label: string; cls: string; tone?: TintTone }> = {
  you: { label: 'You taught', cls: 'text-ember', tone: 'ember' },
  document: { label: 'Document parsed', cls: 'border-line-strong bg-surface-2 text-text-2' },
  behavior: { label: 'Pattern observed', cls: 'text-teal', tone: 'teal' },
  exchange: { label: 'Exchange outcome', cls: 'text-quote', tone: 'quote' },
};

/** "What I learned this week" — horizontal snap strip (memory.md §4). */
export default function LearningFeed({ onFocusFact }: { onFocusFact: (factId: string) => void }) {
  const facts = useTenantFacts();

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-h2 text-text-1">What I learned this week</h2>
          <p className="mt-1 text-small text-text-3">
            Every job, quote, and correction teaches me something.
          </p>
        </div>
        <span className="font-mono text-data text-text-3">{facts.length} entries</span>
      </div>

      <div className="relative">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {facts.map((f, i) => {
            const chip = EVENT_CHIP[f.source];
            return (
              <motion.button
                key={f.id}
                onClick={() => onFocusFact(f.id)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: Math.min(i, 8) * 0.07, duration: 0.4, ease: EASE }}
                className="w-[280px] shrink-0 snap-start rounded-card border border-line-hairline bg-surface-1 p-4 text-left transition-colors duration-150 hover:border-line-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    style={chip.tone ? tintStyle(chip.tone) : undefined}
                    className={cn('rounded-chip border px-1.5 py-0.5 text-[10px] font-medium', chip.cls)}
                  >
                    {chip.label}
                  </span>
                  <span className="font-mono text-[10px] text-text-3">{f.updatedAt}</span>
                </div>
                <div className="mt-2.5 line-clamp-2 min-h-[36px] text-small text-text-1">{f.label}</div>
                <div className="mt-2.5 flex items-center justify-between">
                  <ConfidenceRing value={f.confidence} size={24} showLabel />
                  <span className="text-[10px] text-text-3">{f.evidenceCount} evidence</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        {/* edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-canvas to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent" />
      </div>
    </section>
  );
}
