import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, RotateCcw, Search, ShieldCheck, ChevronDown } from 'lucide-react';
import { useStore, useActiveTenant, useTenantLedger } from '@/store';
import type { LedgerEntry } from '@/store';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const VERDICT_STYLE: Record<LedgerEntry['verdict'], string> = {
  approved: 'bg-ok/10 text-ok',
  auto: 'bg-teal-dim text-teal',
  escalated: 'bg-ember/15 text-ember',
  rejected: 'bg-danger/10 text-danger',
  undone: 'bg-surface-3 text-text-3',
};

const ACTOR_STYLE: Record<LedgerEntry['actor'], string> = {
  user: 'border-line-strong text-text-1',
  conductor: 'border-teal/40 text-teal',
  system: 'border-line-hairline text-text-3',
};

function download(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Audit() {
  const tenant = useActiveTenant();
  const ledger = useTenantLedger();
  const undoLedgerEntry = useStore((s) => s.undoLedgerEntry);
  const canUndo = useStore((s) => s.can('audit.undo'));

  const [actor, setActor] = useState<'all' | LedgerEntry['actor']>('all');
  const [verdict, setVerdict] = useState<'all' | LedgerEntry['verdict']>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      ledger
        .filter((e) => (actor === 'all' ? true : e.actor === actor))
        .filter((e) => (verdict === 'all' ? true : e.verdict === verdict))
        .filter((e) => {
          if (!q.trim()) return true;
          const hay = `${e.action} ${e.actorName} ${e.verdictLabel}`.toLowerCase();
          return hay.includes(q.trim().toLowerCase());
        }),
    [ledger, actor, verdict, q],
  );

  const exportJson = () =>
    download(`fraytline-audit-${tenant.id}.json`, 'application/json', JSON.stringify(rows, null, 2));
  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      'time,actor,actorName,action,verdict,verdictLabel,confidence,undone',
      ...rows.map((e) =>
        [e.time, e.actor, e.actorName, e.action, e.verdict, e.verdictLabel, e.confidence ?? '', e.undone]
          .map((v) => esc(String(v)))
          .join(','),
      ),
    ];
    download(`fraytline-audit-${tenant.id}.csv`, 'text/csv', lines.join('\n'));
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-h1 text-text-1">Audit</h1>
            <p className="mt-1 text-body text-text-2">
              Every action in {tenant.name} — user, Conductor and system — written to the ledger.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-chip border border-line-hairline px-3 py-1.5 text-caption text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={exportJson}
              className="flex items-center gap-1.5 rounded-chip border border-line-hairline px-3 py-1.5 text-caption text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
            >
              <Download className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-chip border border-line-hairline bg-surface-1 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-text-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actions, people…"
              className="w-48 bg-transparent text-small text-text-1 outline-none placeholder:text-text-3"
            />
          </div>
          {(
            [
              { label: 'actor', value: actor, set: setActor, opts: ['all', 'user', 'conductor', 'system'] as const },
              { label: 'verdict', value: verdict, set: setVerdict, opts: ['all', 'approved', 'auto', 'escalated', 'rejected', 'undone'] as const },
            ] as const
          ).map((f) => (
            <div key={f.label} className="flex items-center rounded-chip border border-line-hairline p-0.5 text-micro uppercase">
              {f.opts.map((o) => (
                <button
                  key={o}
                  onClick={() => (f.set as (v: string) => void)(o)}
                  className={cn(
                    'rounded px-2 py-1 transition-colors',
                    f.value === o ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          ))}
          <span className="ml-auto font-mono text-data text-text-3">{rows.length} entries</span>
        </div>
      </motion.div>

      {/* ledger table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
        className="overflow-hidden rounded-panel border border-line-hairline bg-surface-1"
      >
        <div className="grid grid-cols-[64px_110px_1fr_130px_40px] items-center gap-3 border-b border-line-hairline px-4 py-2.5 text-micro uppercase tracking-wide text-text-3">
          <span>Time</span><span>Actor</span><span>Action</span><span>Verdict</span><span />
        </div>
        <div className="divide-y divide-line-hairline">
          {rows.map((e, i) => {
            const open = openId === e.id;
            const undoable = e.reversible && !e.undone && canUndo;
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.25 }}
                className={cn(e.undone && 'opacity-45')}
              >
                <button
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="grid w-full grid-cols-[64px_110px_1fr_130px_40px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/50"
                >
                  <span className="font-mono text-data text-text-3">{e.time}</span>
                  <span className={cn('w-fit rounded-chip border px-2 py-0.5 text-[10px] font-medium', ACTOR_STYLE[e.actor])}>
                    {e.actorName.split(' ')[0]}
                  </span>
                  <span className="truncate text-small text-text-1">{e.action}</span>
                  <span className={cn('w-fit rounded-chip px-2 py-0.5 text-[10px] font-medium', VERDICT_STYLE[e.verdict])}>
                    {e.verdictLabel}
                  </span>
                  <ChevronDown className={cn('h-3.5 w-3.5 justify-self-end text-text-3 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="space-y-2 border-t border-line-hairline bg-surface-2/40 px-4 py-3">
                    {e.confidence !== undefined && (
                      <div className="text-caption text-text-3">confidence <span className="font-mono text-teal">{e.confidence}%</span></div>
                    )}
                    {e.reasoning && e.reasoning.length > 0 && (
                      <div className="space-y-1">
                        {e.reasoning.map((r) => (
                          <div key={r} className="flex items-start gap-1.5 text-caption text-text-2">
                            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-teal" /> {r}
                          </div>
                        ))}
                      </div>
                    )}
                    {undoable && (
                      <button
                        onClick={() => undoLedgerEntry(e.id)}
                        className="flex items-center gap-1.5 rounded-chip border border-ember/40 px-2.5 py-1 text-caption font-medium text-ember transition-colors hover:bg-ember/10"
                      >
                        <RotateCcw className="h-3 w-3" /> Undo this action
                      </button>
                    )}
                    {e.reversible && !canUndo && !e.undone && (
                      <div className="text-caption text-text-3">Reversible — undo requires an Owner sign-in.</div>
                    )}
                    {!e.reversible && <div className="text-caption text-text-3">Not reversible.</div>}
                  </div>
                )}
              </motion.div>
            );
          })}
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-small text-text-3">No entries match these filters.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
