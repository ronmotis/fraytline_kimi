import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Search } from 'lucide-react';
import { useStore, useTenantLedger } from '@/store';
import type { LedgerEntry } from '@/store';
import LedgerRow from '@/components/LedgerRow';
import { trgb, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type ActorFilter = 'all' | LedgerEntry['actor'];
type VerdictFilter = 'all' | LedgerEntry['verdict'];
type WorkflowFilter = 'all' | 'quotes' | 'exchange' | 'movements' | 'comms' | 'money' | 'memory';

const ACTOR_OPTS: { id: ActorFilter; label: string }[] = [
  { id: 'all', label: 'All actors' },
  { id: 'conductor', label: 'Conductor' },
  { id: 'user', label: 'You' },
  { id: 'system', label: 'System' },
];

const VERDICT_OPTS: { id: VerdictFilter; label: string }[] = [
  { id: 'all', label: 'Any outcome' },
  { id: 'auto', label: 'Auto' },
  { id: 'approved', label: 'Approved' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'undone', label: 'Undone' },
];

const WORKFLOW_OPTS: { id: WorkflowFilter; label: string }[] = [
  { id: 'all', label: 'All workflows' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'exchange', label: 'Exchange' },
  { id: 'movements', label: 'Movements' },
  { id: 'comms', label: 'Comms' },
  { id: 'money', label: 'Money' },
  { id: 'memory', label: 'Memory' },
];

function workflowOf(e: LedgerEntry): Exclude<WorkflowFilter, 'all'> {
  const q = e.action.toLowerCase();
  if (/learned|memory|taught|corrected|forgot|confirmed/.test(q)) return 'memory';
  if (/quote|q-\d/.test(q)) return 'quotes';
  if (/bid|exchange|capacity/.test(q)) return 'exchange';
  if (/message|customer|eta|notice|nudge|update/.test(q)) return 'comms';
  if (/fuel|expense|advance|\$|gh₵|payment|invoice|settlement/.test(q)) return 'money';
  return 'movements';
}

/** Section D — the Ledger: full-width governed stream with filters, undo, export. */
export default function LedgerStream() {
  useTheme(); // refresh inline animation colors on theme flip
  const ledger = useTenantLedger();
  const pushToast = useStore((s) => s.pushToast);

  const [actor, setActor] = useState<ActorFilter>('all');
  const [verdict, setVerdict] = useState<VerdictFilter>('all');
  const [workflow, setWorkflow] = useState<WorkflowFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      ledger.filter((e) => {
        if (actor !== 'all' && e.actor !== actor) return false;
        if (verdict !== 'all' && e.verdict !== verdict) return false;
        if (workflow !== 'all' && workflowOf(e) !== workflow) return false;
        if (search.trim() && !e.action.toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
      }),
    [ledger, actor, verdict, workflow, search],
  );

  const exportCsv = () => {
    const header = 'time,actor,action,verdict,confidence,undone';
    const rows = filtered.map((e) =>
      [e.time, e.actorName, `"${e.action.replace(/"/g, '""')}"`, e.verdictLabel, e.confidence ?? '', e.undone].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraytline-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ title: 'Ledger exported', body: `${filtered.length} rows · CSV`, tone: 'ok' });
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-h2 text-text-1">Ledger — everything the system did, and why</h2>
          <p className="mt-1 text-small text-text-3">
            Reversible where possible. Hover a row for its reasoning trace.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-caption text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ACTOR_OPTS.map((o) => (
          <button
            key={o.id}
            onClick={() => setActor(o.id)}
            className={cn(
              'rounded-chip px-2.5 py-1 text-caption transition-colors duration-150',
              actor === o.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
            )}
          >
            {o.label}
          </button>
        ))}
        <span className="h-4 w-px bg-line-hairline" />
        {VERDICT_OPTS.map((o) => (
          <button
            key={o.id}
            onClick={() => setVerdict(o.id)}
            className={cn(
              'rounded-chip px-2.5 py-1 text-caption transition-colors duration-150',
              verdict === o.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
            )}
          >
            {o.label}
          </button>
        ))}
        <span className="h-4 w-px bg-line-hairline" />
        <select
          value={workflow}
          onChange={(e) => setWorkflow(e.target.value as WorkflowFilter)}
          className="rounded-chip border border-line-hairline bg-surface-1 px-2 py-1 text-caption text-text-2 outline-none focus:border-teal"
        >
          {WORKFLOW_OPTS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the ledger…"
            className="w-52 rounded-chip border border-line-hairline bg-surface-1 py-1.5 pl-8 pr-3 text-caption text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-panel border border-line-hairline bg-surface-1">
        <div className="max-h-[480px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {filtered.slice(0, 40).map((e, i) => (
              <motion.div
                key={e.id}
                layout="position"
                initial={{ opacity: 0, y: -10, backgroundColor: trgb('--teal-rgb', 0.10) }}
                animate={{ opacity: 1, y: 0, backgroundColor: trgb('--teal-rgb', 0) }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.24,
                  delay: Math.min(i, 12) * 0.03,
                  backgroundColor: { duration: 1.2 },
                  layout: { duration: 0.24 },
                }}
              >
                <LedgerRow entry={e} />
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-small text-text-3">
              Nothing matches those filters — the Ledger never forgets, it just narrows.
            </div>
          )}
        </div>
        <div className="border-t border-line-hairline px-4 py-2 text-right font-mono text-[10px] text-text-3">
          showing {Math.min(filtered.length, 40)} of {filtered.length}
        </div>
      </div>
    </section>
  );
}
