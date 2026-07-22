import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, CircleCheck, CircleX, Pencil, Send } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { ApprovalAction } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import MemoryChip from '@/components/MemoryChip';
import { tintBorder, tintStyle } from './tints';
import type { TintTone } from './tints';
import { trgb, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const REJECT_REASONS = ['Price', 'Timing', 'Risk', 'Other'] as const;

const PRIMARY_LABEL: Record<ApprovalAction['kind'], string> = {
  expense: 'Approve',
  bid: 'Approve',
  message: 'Send',
  'exchange-post': 'Post',
  rule: 'Activate',
};

const EDIT_LABEL: Record<ApprovalAction['kind'], string> = {
  expense: 'Edit',
  bid: 'Adjust bid',
  message: 'Edit',
  'exchange-post': 'Not now',
  rule: 'Edit',
};

function draftMessage(action: ApprovalAction, tenantName: string): string {
  const delay = action.context.match(/delay\s*([+\-\w]+)/i)?.[1] ?? '+6h';
  const mid = action.movementId ?? 'your shipment';
  return `Hi — quick update on ${mid}: we've been held at the border (${delay}). New ETA Wed 11:00. I'll confirm again at the next checkpoint — no action needed from you. — ${tenantName}`;
}

/** Approval queue card (actions.md §B): Why trace, impact chips, Approve / Edit / Reject
 *  with reject-reason chips and learning toasts. Executes real store mutations. */
export default function QueueCard({
  action,
  index,
  canAct,
  blockNote,
}: {
  action: ApprovalAction;
  index: number;
  canAct: boolean;
  blockNote?: string;
}) {
  useTheme(); // refresh inline colors on theme flip
  const approveAction = useStore((s) => s.approveAction);
  const rejectAction = useStore((s) => s.rejectAction);
  const pushToast = useStore((s) => s.pushToast);
  const tenantName = useStore((s) => s.tenants.find((t) => t.id === s.activeTenantId)?.name ?? 'Fraytline');

  const [whyOpen, setWhyOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'done'>('idle');
  const [rejecting, setRejecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bidAmount, setBidAmount] = useState(action.amount?.amount ?? 0);
  const [messageDraft, setMessageDraft] = useState(() => draftMessage(action, tenantName));

  const approve = () => {
    if (!canAct) return;
    setPhase('done');
    // Materialize checkmark 300ms → collapse (the store removal animates the card out)
    setTimeout(() => approveAction(action.id), 650);
  };

  const rejectWithReason = (reason: string) => {
    rejectAction(action.id);
    pushToast({
      title:
        action.kind === 'bid'
          ? 'Noted — I won’t auto-suggest bids like this without flagging first'
          : `Noted — I’ll factor “${reason.toLowerCase()}” into future suggestions`,
      body: 'learned · visible in Memory',
      tone: 'teal',
    });
  };

  const saveEdit = () => {
    setEditing(false);
    if (action.kind === 'bid') {
      approve();
      pushToast({
        title: `Noted — ${fmtMoney({ amount: bidAmount, currency: action.amount?.currency ?? 'USD' })} is your reference for this lane`,
        body: 'learned · visible in Memory',
        tone: 'teal',
      });
    } else if (action.kind === 'message') {
      approve();
      pushToast({ title: 'Updated message sent', body: 'your edits are logged', tone: 'ok' });
    } else {
      pushToast({
        title: 'Redraft requested',
        body: 'I’ll come back with a revised proposal · noted in Memory',
        tone: 'teal',
      });
    }
  };

  const primaryLabel = PRIMARY_LABEL[action.kind];
  const PrimaryIcon = action.kind === 'message' ? Send : CircleCheck;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.24, delay: 0 } }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: EASE }}
      className="relative mb-3 overflow-hidden rounded-card border border-line-hairline bg-surface-1 p-4"
    >
      {/* Materialize checkmark state */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: trgb('--canvas-rgb', 0.92) }}
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-center gap-2 text-ok"
            >
              <CircleCheck className="h-6 w-6" />
              <span className="text-body-strong">Executed · logging to Ledger</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-body-strong text-text-1">{action.title}</div>
          <div className="mt-0.5 text-caption text-text-2">{action.context}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action.amount && <span className="font-mono text-data text-ember">{fmtMoney(action.amount)}</span>}
          <ConfidenceRing value={action.confidence} size={28} showLabel />
        </div>
      </div>

      {action.impacts.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {action.impacts.map((imp) => (
            <span
              key={imp.label}
              style={tintStyle(imp.tone as TintTone)}
              className={cn(
                'rounded-chip border px-2 py-0.5 text-caption',
                imp.tone === 'ok' && 'text-ok',
                imp.tone === 'teal' && 'text-teal',
                imp.tone === 'ember' && 'text-ember',
                imp.tone === 'danger' && 'text-danger',
              )}
            >
              {imp.label}
            </span>
          ))}
        </div>
      )}

      {/* draft message preview for comms actions */}
      {action.kind === 'message' && (
        <div className="mt-2.5 rounded-chip border border-line-hairline bg-surface-2 px-3 py-2 text-caption italic text-text-2">
          “{messageDraft}”
          <span className="ml-2 not-italic text-ok">✓ inside 07:00–21:00 EAT</span>
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

      {/* edit panel (adjust bid / edit message) */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 rounded-card border border-line-hairline bg-surface-2 p-3">
              {action.kind === 'bid' && action.amount && (
                <>
                  <label className="block text-micro uppercase text-text-3">Your bid ({action.amount.currency})</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="w-40 rounded-chip border border-line-strong bg-surface-1 px-2.5 py-1.5 font-mono text-data text-text-1 outline-none focus:border-teal"
                  />
                  <p className="text-caption text-text-3">
                    Guardrails still apply — below your floor this escalates instead of posting.
                  </p>
                </>
              )}
              {action.kind === 'message' && (
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-chip border border-line-strong bg-surface-1 px-2.5 py-1.5 text-small text-text-1 outline-none focus:border-teal"
                />
              )}
              {action.kind !== 'bid' && action.kind !== 'message' && (
                <textarea
                  placeholder="Tell me what to change — I'll redraft the proposal."
                  rows={2}
                  className="w-full rounded-chip border border-line-strong bg-surface-1 px-2.5 py-1.5 text-small text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="rounded-chip bg-teal px-3 py-1 text-caption font-medium text-canvas hover:opacity-90"
                >
                  {action.kind === 'bid' ? 'Approve at this bid' : action.kind === 'message' ? 'Send edited' : 'Request redraft'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-chip border border-line-strong px-3 py-1 text-caption text-text-2 hover:text-text-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* reject reason chips slide in (200ms) */}
      <AnimatePresence>
        {rejecting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              style={tintStyle('danger')}
              className="mt-2 flex flex-wrap items-center gap-1.5 rounded-card border p-2.5"
            >
              <span className="mr-1 text-caption text-text-3">Why not?</span>
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => rejectWithReason(r)}
                  className="rounded-chip border border-line-strong px-2 py-0.5 text-caption text-text-2 transition-colors hover:text-danger"
                >
                  {r}
                </button>
              ))}
              <button
                onClick={() => setRejecting(false)}
                className="ml-auto text-caption text-text-3 hover:text-text-1"
              >
                Keep
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={approve}
          disabled={!canAct}
          title={blockNote}
          className="flex items-center gap-1.5 rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PrimaryIcon className="h-3.5 w-3.5" /> {primaryLabel}
        </button>
        {action.kind === 'exchange-post' ? (
          <button
            onClick={() => rejectWithReason('Timing')}
            disabled={!canAct}
            title={blockNote}
            className="flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1 disabled:opacity-40"
          >
            Not now
          </button>
        ) : (
          <button
            onClick={() => setEditing((v) => !v)}
            disabled={!canAct}
            title={blockNote}
            className="flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1 disabled:opacity-40"
          >
            <Pencil className="h-3.5 w-3.5" /> {EDIT_LABEL[action.kind]}
          </button>
        )}
        <button
          onClick={() => setRejecting((v) => !v)}
          disabled={!canAct}
          title={blockNote}
          style={tintBorder('danger')}
          className="flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-small text-danger transition-opacity hover:opacity-75 disabled:opacity-40"
        >
          <CircleX className="h-3.5 w-3.5" /> {action.kind === 'message' ? 'Dismiss' : 'Reject'}
        </button>
        {!canAct && blockNote && <span className="text-caption text-text-3">{blockNote}</span>}
      </div>
    </motion.div>
  );
}
