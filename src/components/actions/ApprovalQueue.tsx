import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, ShieldCheck, X } from 'lucide-react';
import { useStore, usePendingApprovals, fmtMoney } from '@/store';
import type { ApprovalAction, Role } from '@/store';
import QueueCard from './QueueCard';
import { BACKDROP_STYLE, tintStyle } from './tints';
import EmptyState from '@/components/EmptyState';

/** role lens (actions.md · Role & Tenant Variations) */
function roleCanAct(role: Role, action: ApprovalAction): boolean {
  if (role === 'Owner') return true;
  if (role === 'Dispatcher') return action.kind === 'message';
  if (role === 'Finance') return action.kind === 'expense';
  return false;
}

/** "inside guardrails" = expense/bid items the policy engine would auto-approve */
function useBatchable(pending: ApprovalAction[]) {
  const checkPolicy = useStore((s) => s.checkPolicy);
  return pending.filter((a) => {
    if (a.kind !== 'expense' && a.kind !== 'bid') return false;
    const amountUsd = a.amount?.amount ?? 0;
    const verdict = checkPolicy({ kind: a.kind, amountUsd }).verdict;
    return verdict === 'auto';
  });
}

export default function ApprovalQueue() {
  const pending = usePendingApprovals();
  const role = useStore((s) => s.role);
  const approveAction = useStore((s) => s.approveAction);
  const batchable = useBatchable(pending);
  const [batchOpen, setBatchOpen] = useState(false);

  const confirmBatch = () => {
    setBatchOpen(false);
    batchable.forEach((a, i) => setTimeout(() => approveAction(a.id), 200 + i * 180));
  };

  return (
    <section className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-h2 text-text-1">Waiting for you</h2>
          {pending.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 font-mono text-[10px] font-semibold text-canvas">
              {pending.length}
            </span>
          )}
        </div>
        {batchable.length > 0 && (
          <button
            onClick={() => setBatchOpen(true)}
            style={tintStyle('ember')}
            className="flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-caption font-medium text-ember transition-opacity hover:opacity-80"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Approve all inside guardrails ({batchable.length})
          </button>
        )}
      </div>

      <div className="flex-1">
        {pending.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Nothing waiting"
            body="When I need your decision — a regulated document, a bid outside routine — it lands here with the full reasoning attached."
          />
        ) : (
          <AnimatePresence initial={false}>
            {pending.map((a, i) => {
              const canAct = roleCanAct(role, a);
              return (
                <QueueCard
                  key={a.id}
                  action={a}
                  index={i}
                  canAct={canAct}
                  blockNote={canAct ? undefined : `${role} role can’t decide this — escalated to the Owner`}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* batch summary modal */}
      <AnimatePresence>
        {batchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={BACKDROP_STYLE}
            className="fixed inset-0 z-[80] flex items-start justify-center pt-[18vh]"
            onClick={() => setBatchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: -8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: -8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-[520px] max-w-[92vw] rounded-modal border border-line-strong p-6 shadow-modal"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-h3 text-text-1">Approve {batchable.length} inside guardrails?</div>
                  <p className="mt-1 text-caption text-text-3">
                    Each item passed its policy check. Everything logs to the Ledger and stays reversible where possible.
                  </p>
                </div>
                <button onClick={() => setBatchOpen(false)} className="text-text-3 hover:text-text-1" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {batchable.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-line-hairline bg-surface-2 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-small text-text-1">{a.title}</div>
                      <div className="text-caption text-text-3">{a.context}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.amount && <span className="font-mono text-data text-ember">{fmtMoney(a.amount)}</span>}
                      <span
                        style={tintStyle('ok')}
                        className="rounded-chip border px-1.5 py-0.5 text-[10px] font-medium text-ok"
                      >
                        ✓ inside policy
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={confirmBatch}
                  className="flex items-center gap-1.5 rounded-chip bg-ember px-4 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
                >
                  <CircleCheck className="h-4 w-4" /> Confirm batch
                </button>
                <button
                  onClick={() => setBatchOpen(false)}
                  className="rounded-chip border border-line-strong px-4 py-2 text-small text-text-2 hover:text-text-1"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
