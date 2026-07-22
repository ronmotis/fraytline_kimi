import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, User, Cog } from 'lucide-react';
import { useStore } from '@/store';
import type { LedgerEntry } from '@/store';
import ConfidenceRing from './ConfidenceRing';
import { cn } from '@/lib/utils';

const ACTOR = {
  conductor: { icon: Sparkles, cls: 'text-teal border-teal/30 bg-teal-dim' },
  user: { icon: User, cls: 'text-ember border-ember/30 bg-ember-dim' },
  system: { icon: Cog, cls: 'text-text-3 border-line-strong bg-surface-2' },
} as const;

const VERDICT_CLS: Record<LedgerEntry['verdict'], string> = {
  auto: 'text-ok border-ok/30 bg-ok/10',
  approved: 'text-ember border-ember/30 bg-ember-dim',
  escalated: 'text-warn border-warn/30 bg-warn/10',
  rejected: 'text-danger border-danger/30 bg-danger/10',
  undone: 'text-text-3 border-line-strong bg-surface-2',
};

/** Governance stream row (§9.12) with undo + reasoning popover. */
export default function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const undoLedgerEntry = useStore((s) => s.undoLedgerEntry);
  const [hover, setHover] = useState(false);
  const actor = ACTOR[entry.actor];
  const Icon = actor.icon;

  return (
    <div
      className="relative flex items-center gap-3 border-b border-line-hairline px-3 py-2.5 transition-colors duration-150 hover:bg-surface-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="w-12 shrink-0 font-mono text-data text-text-3">{entry.time}</span>
      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-chip border px-1.5 py-0.5 text-[10px] font-medium', actor.cls)}>
        <Icon className="h-3 w-3" /> {entry.actorName}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-small', entry.undone ? 'text-text-3 line-through' : 'text-text-1')}>
        {entry.action}
      </span>
      <span className={cn('hidden shrink-0 rounded-chip border px-1.5 py-0.5 text-[10px] font-medium sm:inline', VERDICT_CLS[entry.verdict])}>
        {entry.verdictLabel}
      </span>
      {entry.confidence !== undefined && <ConfidenceRing value={entry.confidence} size={18} />}
      {entry.reversible && !entry.undone && (
        <button
          onClick={() => undoLedgerEntry(entry.id)}
          className="shrink-0 text-micro uppercase text-text-3 transition-colors hover:text-ember"
        >
          Undo
        </button>
      )}
      <AnimatePresence>
        {hover && entry.reasoning && entry.reasoning.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="glass absolute right-3 top-full z-50 mt-1 w-72 rounded-card border border-line-strong p-3 shadow-modal"
          >
            <div className="mb-1 text-micro uppercase text-text-3">Reasoning trace</div>
            {entry.reasoning.map((r, i) => (
              <div key={i} className="flex gap-1.5 py-0.5 text-caption text-text-2">
                <span className="text-teal">{i + 1}.</span> {r}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
