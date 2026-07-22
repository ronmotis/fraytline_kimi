import { LayoutGroup, motion } from 'framer-motion';
import {
  ArrowLeftRight, FileText, FileWarning, Lock, MessageSquare, Truck, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import AutonomyDial from '@/components/AutonomyDial';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface Workflow {
  key: string;
  icon: LucideIcon;
  name: string;
  desc: string;
  stat: string;
  tenants?: string[]; // undefined = all
}

const WORKFLOWS: Workflow[] = [
  {
    key: 'quoting', icon: FileText, name: 'Quote pricing & sending',
    desc: 'Drafts prices from lane memory, sends when you approve',
    stat: '31 drafted · 29 sent by you',
  },
  {
    key: 'dispatch', icon: Truck, name: 'Dispatch assignment',
    desc: 'Proposes vehicle & driver matches with compatibility reasoning',
    stat: '18 proposed · 16 approved', tenants: ['meridian'],
  },
  {
    key: 'customer-updates', icon: MessageSquare, name: 'Customer updates (ETA, delays)',
    desc: 'Drafts ETAs and delay notices in your voice, inside quiet hours',
    stat: '44 drafted · 41 sent',
  },
  {
    key: 'exchange', icon: ArrowLeftRight, name: 'Exchange bidding',
    desc: 'Bids on matching loads, never below your floors',
    stat: '7 bids · 5 won', tenants: ['meridian'],
  },
  {
    key: 'documents', icon: FileWarning, name: 'Document renewals (non-regulated)',
    desc: 'Renews expiring documents with your agents before they lapse',
    stat: '3 renewed', tenants: ['meridian'],
  },
  {
    key: 'expenses', icon: Wallet, name: 'Expenses & advances',
    desc: 'Auto-approves spend inside your cap, disputes nothing without you',
    stat: '12 auto-approved · 0 disputed',
  },
];

const SAVANNAH_STATS: Record<string, string> = {
  quoting: '9 drafted · 8 sent by you',
  'customer-updates': '6 drafted · 6 sent',
  expenses: '4 auto-approved · 0 disputed',
};

/** Section A — autonomy matrix: one dial per workflow (actions.md §A). */
export default function AutonomyMatrix() {
  const autonomy = useStore((s) => s.autonomy);
  const setAutonomy = useStore((s) => s.setAutonomy);
  const role = useStore((s) => s.role);
  const tenant = useActiveTenant();
  const readOnly = role !== 'Owner';

  const rows = WORKFLOWS.filter((w) => !w.tenants || w.tenants.includes(tenant.id));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-h2 text-text-1">How much may I do alone?</h2>
          <p className="mt-1 text-small text-text-3">
            A dial per workflow. Guardrails always apply — autonomy never overrides policy.
          </p>
        </div>
        {readOnly && (
          <span className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2 py-1 text-caption text-text-3">
            <Lock className="h-3 w-3" /> Read-only as {role} — the Owner sets autonomy
          </span>
        )}
      </div>

      <div className="divide-y divide-line-hairline rounded-panel border border-line-hairline bg-surface-1">
        {rows.map((w, i) => {
          const Icon = w.icon;
          const stat = tenant.id === 'savannah' ? (SAVANNAH_STATS[w.key] ?? w.stat) : w.stat;
          return (
            <motion.div
              key={w.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3" style={{ minWidth: 260 }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-line-hairline bg-surface-2">
                  <Icon className="h-4 w-4 text-text-2" />
                </span>
                <div className="min-w-0">
                  <div className="text-body-strong text-text-1">{w.name}</div>
                  <div className="truncate text-small text-text-3">{w.desc}</div>
                </div>
              </div>
              <div className="hidden w-44 text-right font-mono text-data text-text-3 md:block">{stat}</div>
              <div className={cn(readOnly && 'pointer-events-none opacity-50')}>
                {/* LayoutGroup scopes AutonomyDial's shared layoutId so multiple dials coexist */}
                <LayoutGroup id={`dial-${w.key}`}>
                  <AutonomyDial
                    value={autonomy[w.key] ?? 'Manual'}
                    onChange={(level) => setAutonomy(w.key, level)}
                  />
                </LayoutGroup>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
