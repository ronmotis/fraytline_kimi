import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Activity, FileText, User } from 'lucide-react';
import { useStore, useFact } from '@/store';
import type { FactSource } from '@/store';
import ConfidenceRing from './ConfidenceRing';
import { cn } from '@/lib/utils';

const SOURCE_ICON: Record<FactSource, typeof User> = {
  you: User,
  document: FileText,
  behavior: Activity,
  exchange: ArrowLeftRight,
};

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

/**
 * The trust primitive (design.md §9.2). Cite a learned fact inline:
 *   <MemoryChip factId="f-lane-nbo-kla" />  — or pass label/confidence/source directly.
 * Hover → evidence popover with Correct / Forget (wired to the learning loop).
 */
export default function MemoryChip({
  factId,
  label,
  confidence,
  source,
  evidence,
  evidenceCount,
  className,
}: {
  factId?: string;
  label?: string;
  confidence?: number;
  source?: FactSource;
  evidence?: string[];
  evidenceCount?: number;
  className?: string;
}) {
  const fact = useFact(factId);
  const correctFact = useStore((s) => s.correctFact);
  const forgetFact = useStore((s) => s.forgetFact);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const openPopover = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 272) });
    }
    setOpen(true);
  };

  const text = fact?.label ?? label ?? '';
  const conf = fact?.confidence ?? confidence ?? 50;
  const src: FactSource = fact?.source ?? source ?? 'behavior';
  const ev = fact?.evidence ?? evidence ?? [];
  const evCount = fact?.evidenceCount ?? evidenceCount ?? ev.length;
  const Icon = SOURCE_ICON[src];
  if (!text) return null;

  return (
    <span
      ref={anchorRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={openPopover}
      onMouseLeave={() => { setOpen(false); setEditing(false); }}
    >
      <motion.span
        initial={{ scale: 0.9, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING}
        className="inline-flex cursor-default items-center gap-1.5 rounded-chip border border-teal/25 bg-teal-dim px-1.5 py-0.5 align-middle text-caption text-teal"
      >
        <span className="text-[10px]">◈</span>
        <span className="whitespace-nowrap">{text}</span>
        <ConfidenceRing value={conf} size={14} />
        <Icon className="h-3 w-3 opacity-70" />
      </motion.span>

      <AnimatePresence>
        {open && pos && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="glass z-[70] block w-64 rounded-card border border-line-strong p-3 text-left shadow-modal"
          >
            <span className="mb-1.5 flex items-center justify-between">
              <span className="text-micro uppercase text-text-3">Evidence · {evCount}</span>
              <ConfidenceRing value={conf} size={22} showLabel />
            </span>
            <span className="mb-2 block space-y-1">
              {ev.map((e, i) => (
                <span key={i} className="flex items-center gap-1.5 text-caption text-text-2">
                  <span className="h-1 w-1 rounded-full bg-teal" /> {e}
                </span>
              ))}
              {ev.length === 0 && <span className="block text-caption text-text-3">No evidence recorded yet.</span>}
            </span>
            {fact && !editing && (
              <span className="flex gap-1.5">
                <button
                  className="rounded-chip border border-line-strong px-2 py-1 text-micro uppercase text-text-2 transition-colors hover:border-teal hover:text-teal"
                  onClick={() => { setEditing(true); setDraft(fact.label); }}
                >
                  Correct
                </button>
                <button
                  className="rounded-chip border border-line-strong px-2 py-1 text-micro uppercase text-text-2 transition-colors hover:border-danger hover:text-danger"
                  onClick={() => { forgetFact(fact.id); setOpen(false); }}
                >
                  Forget
                </button>
              </span>
            )}
            {fact && editing && (
              <span className="flex gap-1.5">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { correctFact(fact.id, draft); setEditing(false); setOpen(false); }
                  }}
                  className="w-full rounded-chip border border-line-strong bg-surface-2 px-2 py-1 text-caption text-text-1 outline-none focus:border-teal"
                />
                <button
                  className="rounded-chip bg-teal px-2 py-1 text-micro uppercase text-canvas"
                  onClick={() => { correctFact(fact.id, draft); setEditing(false); setOpen(false); }}
                >
                  Save
                </button>
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
