import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Activity, Check, FileText, Pencil, Trash2, User } from 'lucide-react';
import { useStore, useTenantQuotes } from '@/store';
import type { FactSource, MemoryFact } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import { tintBorder, tintStyle } from './tints';
import type { TintTone } from './tints';
import { trgb, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SOURCE_META: Record<FactSource, { icon: typeof User; label: string; cls: string; tone?: TintTone }> = {
  you: { icon: User, label: 'you', cls: 'text-ember', tone: 'ember' },
  document: { icon: FileText, label: 'document', cls: 'border-line-strong bg-surface-2 text-text-2' },
  behavior: { icon: Activity, label: 'behavior', cls: 'text-teal', tone: 'teal' },
  exchange: { icon: ArrowLeftRight, label: 'exchange', cls: 'text-quote', tone: 'quote' },
};

/** Fact stream card (memory.md §3): confidence, source, evidence, Confirm / Correct / Forget. */
export default function FactCard({
  fact,
  index,
  highlight,
  onTeach,
}: {
  fact: MemoryFact;
  index: number;
  highlight: boolean;
  onTeach: (prefill: string) => void;
}) {
  useTheme(); // refresh flash/highlight tint on theme flip
  const confirmFact = useStore((s) => s.confirmFact);
  const correctFact = useStore((s) => s.correctFact);
  const forgetFact = useStore((s) => s.forgetFact);
  const quotes = useTenantQuotes();

  const [flash, setFlash] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fact.label);
  const [reason, setReason] = useState('');
  const [correctedNote, setCorrectedNote] = useState<string | null>(null);
  const [forgetting, setForgetting] = useState(false);

  const lowConfidence = fact.confidence < 60;
  const pending = fact.status === 'unreviewed';
  const dependentQuotes = quotes.filter(
    (q) => q.memoryFactId === fact.id && (q.status === 'draft' || q.status === 'sent' || q.status === 'opened'),
  );

  useEffect(() => {
    if (!correctedNote) return;
    const t = setTimeout(() => setCorrectedNote(null), 6000);
    return () => clearTimeout(t);
  }, [correctedNote]);

  const onConfirm = () => {
    confirmFact(fact.id);
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
  };

  const onSaveCorrection = () => {
    correctFact(fact.id, draft);
    setEditing(false);
    setCorrectedNote(
      dependentQuotes.length > 0
        ? `${dependentQuotes.length} draft quote${dependentQuotes.length > 1 ? 's' : ''} will use the new rate.`
        : 'Correction applied — confidence recalibrated.',
    );
  };

  const onForget = () => {
    setForgetting(true);
    setTimeout(() => forgetFact(fact.id), 240);
  };

  const src = SOURCE_META[fact.source];
  const SrcIcon = src.icon;

  return (
    <motion.div
      layout="position"
      id={`fact-${fact.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: forgetting ? 0.4 : 1,
        y: 0,
        backgroundColor: flash
          ? [trgb('--teal-rgb', 0), trgb('--teal-rgb', 0.16), trgb('--teal-rgb', 0)]
          : trgb('--teal-rgb', 0),
        boxShadow: highlight
          ? [`0 0 0 1px ${trgb('--teal-rgb', 0.9)}`, `0 0 0 1px ${trgb('--teal-rgb', 0)}`]
          : `0 0 0 1px ${trgb('--teal-rgb', 0)}`,
      }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{
        duration: 0.3,
        ease: EASE,
        delay: index * 0.05,
        backgroundColor: { duration: 0.9, delay: 0 },
        boxShadow: { duration: 1.6, delay: 0 },
        layout: { duration: 0.24 },
      }}
      style={lowConfidence ? tintBorder('warn') : undefined}
      className={cn(
        'mb-3 overflow-hidden rounded-card border border-line-hairline bg-surface-1 p-4',
        pending && 'living-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('min-w-0 text-body-strong text-text-1', forgetting && 'line-through')}>
          {fact.label}
        </div>
        <ConfidenceRing value={fact.confidence} size={28} showLabel />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          style={src.tone ? tintStyle(src.tone) : undefined}
          className={cn('inline-flex items-center gap-1 rounded-chip border px-1.5 py-0.5 text-[10px] font-medium', src.cls)}
        >
          <SrcIcon className="h-3 w-3" /> {src.label}
        </span>
        <span className="text-small text-text-3">
          {fact.evidence.join(' · ')} · updated {fact.updatedAt}
        </span>
      </div>

      {pending && (
        <div
          style={tintStyle('teal')}
          className="mt-2.5 rounded-chip border px-2.5 py-1.5 text-caption text-teal"
        >
          Awaiting your review — confirm to make this a rule I follow.
        </div>
      )}

      {lowConfidence && (
        <div
          style={tintStyle('warn')}
          className="mt-2.5 flex flex-wrap items-center gap-2 rounded-chip border px-2.5 py-1.5"
        >
          <span className="flex-1 text-caption text-warn">
            Thin evidence — I’ll ask before quoting or routing on this.
          </span>
          <button
            onClick={() => onTeach(`What I know about ${fact.label.split('—')[0].trim()}: `)}
            style={tintBorder('warn')}
            className="rounded-chip border px-2 py-0.5 text-micro uppercase text-warn transition-opacity hover:opacity-75"
          >
            Add data
          </button>
          <button
            onClick={() => onTeach('')}
            style={tintBorder('warn')}
            className="rounded-chip border px-2 py-0.5 text-micro uppercase text-warn transition-opacity hover:opacity-75"
          >
            Teach
          </button>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 rounded-card border border-line-hairline bg-surface-2 p-3">
              <label className="block text-micro uppercase text-text-3">Correct the fact</label>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSaveCorrection()}
                className="w-full rounded-chip border border-line-strong bg-surface-1 px-2.5 py-1.5 text-small text-text-1 outline-none focus:border-teal"
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What changed? (optional — helps me learn)"
                className="w-full rounded-chip border border-line-hairline bg-surface-1 px-2.5 py-1.5 text-caption text-text-2 outline-none placeholder:text-text-3 focus:border-teal"
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveCorrection}
                  className="rounded-chip bg-teal px-3 py-1 text-caption font-medium text-canvas transition-opacity hover:opacity-90"
                >
                  Save correction
                </button>
                <button
                  onClick={() => { setEditing(false); setDraft(fact.label); }}
                  className="rounded-chip border border-line-strong px-3 py-1 text-caption text-text-2 hover:text-text-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {correctedNote && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-caption text-teal"
        >
          ◈ {correctedNote}
        </motion.div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onConfirm}
          style={tintStyle('teal')}
          className="flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-caption font-medium text-teal transition-opacity hover:opacity-80"
        >
          <Check className="h-3.5 w-3.5" /> Confirm
        </button>
        <button
          onClick={() => { setEditing((v) => !v); setDraft(fact.label); }}
          className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2.5 py-1 text-caption text-text-2 transition-colors hover:text-text-1"
        >
          <Pencil className="h-3.5 w-3.5" /> Correct
        </button>
        <button
          onClick={onForget}
          style={tintBorder('danger')}
          className="flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-caption text-text-3 transition-colors hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" /> Forget
        </button>
      </div>
    </motion.div>
  );
}
