import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useStore, useTenantFacts } from '@/store';
import MemoryChip from '@/components/MemoryChip';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Win/Loss learning strip (quotes.md §4): recent learnings from quotes.
 * Confirm raises confidence (store learning loop); Dismiss archives the fact.
 */
export default function LearningStrip() {
  const facts = useTenantFacts();
  const confirmFact = useStore((s) => s.confirmFact);
  const forgetFact = useStore((s) => s.forgetFact);

  const learnings = facts
    .filter((f) => f.kind === 'pricing' || f.kind === 'customer' || f.kind === 'pattern')
    .sort((a, b) => (a.status === 'unreviewed' ? -1 : 0) - (b.status === 'unreviewed' ? -1 : 0))
    .slice(0, 3);

  if (learnings.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.85 }}
      className="mt-8 rounded-panel border border-teal/20 bg-teal-dim/20 p-4"
    >
      <div className="mb-3 text-micro uppercase text-teal">Recent learnings from your quotes</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {learnings.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.85 }}
            transition={{ delay: i * 0.07, duration: 0.3, ease: EASE }}
            className="rounded-card border border-line-hairline bg-surface-1 p-3"
          >
            <div className="text-caption text-text-2">
              {f.status === 'unreviewed' ? 'New — review this learning' : 'Confirmed learning'}
            </div>
            <div className="mt-2">
              <MemoryChip factId={f.id} />
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => confirmFact(f.id)}
                className="flex items-center gap-1 rounded-chip border border-teal/40 px-2 py-1 text-[11px] font-medium text-teal transition-colors hover:border-teal"
              >
                <Check className="h-3 w-3" /> Confirm
              </button>
              <button
                onClick={() => forgetFact(f.id)}
                className="flex items-center gap-1 rounded-chip border border-line-strong px-2 py-1 text-[11px] text-text-3 transition-colors hover:border-danger/40 hover:text-danger"
              >
                <X className="h-3 w-3" /> Dismiss
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
