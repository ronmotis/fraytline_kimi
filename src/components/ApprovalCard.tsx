import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, CircleCheck, CircleX, Pencil } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { ApprovalAction } from '@/store';
import ConfidenceRing from './ConfidenceRing';
import MemoryChip from './MemoryChip';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Proposed governed action (§9.11): Why trace, impact chips, Approve / Edit / Reject. */
export default function ApprovalCard({ action }: { action: ApprovalAction }) {
  const approveAction = useStore((s) => s.approveAction);
  const rejectAction = useStore((s) => s.rejectAction);
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="overflow-hidden rounded-card border border-line-hairline bg-surface-1 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-body-strong text-text-1">{action.title}</div>
          <div className="mt-0.5 text-caption text-text-2">{action.context}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action.amount && (
            <span className="font-mono text-data text-ember">{fmtMoney(action.amount)}</span>
          )}
          <ConfidenceRing value={action.confidence} size={28} showLabel />
        </div>
      </div>

      {action.impacts.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {action.impacts.map((imp) => (
            <span
              key={imp.label}
              className={cn(
                'rounded-chip border px-2 py-0.5 text-caption',
                imp.tone === 'ok' && 'border-ok/30 bg-ok/10 text-ok',
                imp.tone === 'teal' && 'border-teal/30 bg-teal-dim text-teal',
                imp.tone === 'ember' && 'border-ember/30 bg-ember-dim text-ember',
                imp.tone === 'danger' && 'border-danger/30 bg-danger/10 text-danger',
              )}
            >
              {imp.label}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setWhyOpen((v) => !v)}
        className="mt-2.5 flex items-center gap-1 text-caption text-teal transition-colors hover:text-text-1"
      >
        Why
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', whyOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {whyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 rounded-card border border-line-hairline bg-surface-2 p-3">
              {action.reasoning.map((r, i) => (
                <div key={i} className="flex gap-2 text-caption text-text-2">
                  <span className="font-mono text-teal">{i + 1}.</span>
                  <span>{r}</span>
                </div>
              ))}
              {action.citedFactIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {action.citedFactIds.map((id) => <MemoryChip key={id} factId={id} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => approveAction(action.id)}
          className="flex items-center gap-1.5 rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
        >
          <CircleCheck className="h-3.5 w-3.5" /> Approve
        </button>
        <button className="flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={() => rejectAction(action.id)}
          className="flex items-center gap-1.5 rounded-chip border border-danger/40 px-3 py-1.5 text-small text-danger transition-colors hover:bg-danger/10"
        >
          <CircleX className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </motion.div>
  );
}
