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
            className="flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-caption font-medium text-ember transition-colors hover:brightness-110"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Approve {batchable.length} inside guardrails
          </button>
        )}
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Queue is clear"
          body="Anything the Conductor wants to do beyond your guardrails will land here first — with its reasoning attached."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {pending.map((a) => (
            <QueueCard key={a.id} action={a} canAct={roleCanAct(role, a)} role={role} />
          ))}
        </div>
      )}

      {/* batch-approve summary modal */}
      <AnimatePresence>
        {batchOpen && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={BACKDROP_STYLE} onClick={() => setBatchOpen(false)} />
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="glass relative w-[480px] max-w-full rounded-modal border border-line-strong p-5 shadow-modal"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-h3 text-text-1">Approve {batchable.length} inside guardrails</h3>
                <button onClick={() => setBatchOpen(false)} className="rounded p-1 text-text-3 hover:text-text-1"><X className="h-4 w-4" /></button>
              </div>
              <div className="mb-3 space-y-1.5">
                {batchable.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-small">
                    <span className="min-w-0 flex-1 truncate text-text-1">{a.title}</span>
                    {a.amount && <span className="font-mono text-data text-text-2">{fmtMoney(a.amount)}</span>}
                  </div>
                ))}
              </div>
              <p className="mb-4 text-caption text-text-3">
                Each action passes the guardrail engine individually and is logged to the Ledger with Undo.
              </p>
              <button onClick={confirmBatch} className="w-full rounded-chip bg-ember px-4 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi">
                Confirm all
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
