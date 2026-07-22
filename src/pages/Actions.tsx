import { motion } from 'framer-motion';
import { useStore, usePendingApprovals, useTenantLedger } from '@/store';
import AutonomyMatrix from '@/components/actions/AutonomyMatrix';
import ApprovalQueue from '@/components/actions/ApprovalQueue';
import GuardrailEditor from '@/components/actions/GuardrailEditor';
import LedgerStream from '@/components/actions/LedgerStream';
import { tintStyle } from '@/components/actions/tints';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function Actions() {
  const pending = usePendingApprovals();
  const ledger = useTenantLedger();
  const autonomy = useStore((s) => s.autonomy);
  const policies = useStore((s) => s.policies.filter((p) => p.tenantId === s.activeTenantId && p.enabled));

  const autonomousCount = Object.values(autonomy).filter((l) => l === 'Autonomous').length;

  const chips = [
    { label: `${pending.length} waiting for you`, tone: pending.length > 0 ? 'ember' : 'dim' },
    { label: `${policies.length} guardrails active`, tone: 'teal' },
    { label: `${autonomousCount} workflows autonomous`, tone: 'dim' },
    { label: `${ledger.length} ledger entries`, tone: 'dim' },
  ] as const;

  return (
    <div className="space-y-8">
      {/* header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-h1 text-text-1">Autonomy & Governance</h1>
          <p className="mt-1.5 max-w-xl text-body text-text-2">
            What Fraytline may do alone, what waits for you, and the rules it never breaks — all reversible, all logged.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              style={c.tone === 'ember' ? tintStyle('ember') : c.tone === 'teal' ? tintStyle('teal') : undefined}
              className={cn(
                'rounded-chip border px-2.5 py-1.5 text-caption font-medium',
                c.tone === 'ember' && 'text-ember',
                c.tone === 'teal' && 'text-teal',
                c.tone === 'dim' && 'border-line-hairline bg-surface-1 text-text-3',
              )}
            >
              {c.label}
            </span>
          ))}
        </div>
      </motion.header>

      {/* Section A — autonomy matrix */}
      <AutonomyMatrix />

      {/* Sections B + C — approvals & guardrails */}
      <div className="grid grid-cols-12 items-start gap-6">
        <motion.div
          className="col-span-12 xl:col-span-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <ApprovalQueue />
        </motion.div>
        <motion.div
          className="col-span-12 xl:col-span-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <GuardrailEditor />
        </motion.div>
      </div>

      {/* Section D — ledger */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <LedgerStream />
      </motion.div>
    </div>
  );
}
