import { useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, LayoutGrid, Table2, Command, Inbox, X } from 'lucide-react';
import { useStore, useTenantQuotes, useActiveTenant, fmtMoney } from '@/store';
import type { Movement, Quote } from '@/store';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import ConfidenceRing from '@/components/ConfidenceRing';
import EmptyState from '@/components/EmptyState';
import PipelineBoard from '@/components/quotes/PipelineBoard';
import InquiryInbox from '@/components/quotes/InquiryInbox';
import QuoteComposer from '@/components/quotes/QuoteComposer';
import QuoteDrawer from '@/components/quotes/QuoteDrawer';
import LearningStrip from '@/components/quotes/LearningStrip';
import { LOST_REASONS, quoteStatusChip, statusToCol } from '@/components/quotes/quoteUtils';
import type { ColKey, LostReason, QuoteOverride } from '@/components/quotes/quoteUtils';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function Quotes() {
  const tenant = useActiveTenant();
  const role = useStore((s) => s.role);
  const quotes = useTenantQuotes();
  const movements = useStore((s) => s.movements);
  const sendQuote = useStore((s) => s.sendQuote);
  const convertQuoteToMovement = useStore((s) => s.convertQuoteToMovement);
  const markQuoteWon = useStore((s) => s.markQuoteWon);
  const markQuoteLost = useStore((s) => s.markQuoteLost);
  const addInquiry = useStore((s) => s.addInquiry);
  const customers = useStore((s) => s.customers.filter((c) => c.tenantId === s.activeTenantId));
  const teachFact = useStore((s) => s.teachFact);
  const pushToast = useStore((s) => s.pushToast);
  const laneFacts = useStore((s) => s.memoryFacts);

  const [view, setView] = useState<'board' | 'table'>('board');
  const [composerOpen, setComposerOpen] = useState(false);
  const [inqModal, setInqModal] = useState(false);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [overrides, setOverrides] = useState<Record<string, QuoteOverride>>({});
  const [converted, setConverted] = useState<Record<string, Movement>>({});
  const [lostPrompt, setLostPrompt] = useState<Quote | null>(null);

  // quote → movement id (seed links + live conversions + Q-309 story link)
  const convertedMap = useMemo(() => {
    const map: Record<string, string> = { 'Q-309': 'MR-2479' };
    for (const m of movements) if (m.quoteId) map[m.quoteId] = m.id;
    for (const [qid, m] of Object.entries(converted)) map[qid] = m.id;
    return map;
  }, [movements, converted]);

  if (role === 'Customer') return <Navigate to="/today" replace />;

  const effectiveCol = (q: Quote): ColKey => overrides[q.id]?.col ?? statusToCol(q.status);

  const onDropQuote = (q: Quote, col: ColKey) => {
    if (col === 'sent') {
      if (q.status === 'draft') sendQuote(q.id); // governed send — toast + ledger from store
      else setOverrides((o) => ({ ...o, [q.id]: { col } }));
      return;
    }
    if (col === 'negotiating') {
      const counter = Math.round((q.price.amount * 0.974) / 10) * 10;
      setOverrides((o) => ({ ...o, [q.id]: { col, counter } }));
      pushToast({ title: `${q.customer} countered ${q.id}`, body: `${fmtMoney({ amount: counter, currency: q.price.currency })} offered`, tone: 'ember' });
      return;
    }
    if (col === 'won') {
      setOverrides((o) => ({ ...o, [q.id]: { col } }));
      markQuoteWon(q.id); // status + ledger in the store
      setSelected(q); // drawer opens with the convert CTA — the pipeline payoff
      pushToast({ title: `Convert ${q.id} to movement?`, body: 'one click in the drawer · hands off to Dispatch', tone: 'ok' });
      return;
    }
    if (col === 'lost') {
      setLostPrompt(q);
      return;
    }
    setOverrides((o) => ({ ...o, [q.id]: { col } }));
  };

  const commitLost = (reason: LostReason) => {
    const q = lostPrompt;
    if (!q) return;
    setOverrides((o) => ({ ...o, [q.id]: { col: 'lost', reason } }));
    markQuoteLost(q.id, reason); // status + ledger in the store
    const fact = q.memoryFactId ? laneFacts.find((f) => f.id === q.memoryFactId) : undefined;
    const avg = fact ? Number(fact.value) || q.price.amount : q.price.amount;
    const pct = Math.max(0, Math.round(((q.price.amount - avg) / avg) * 100));
    teachFact({
      label: `Lost ${q.id} at +${pct}% above memory avg on ${q.from}→${q.to} (${reason})`,
      value: String(q.price.amount),
      kind: 'pricing',
    });
    setLostPrompt(null);
  };

  const onConvert = (q: Quote) => {
    const movement = convertQuoteToMovement(q.id);
    if (movement) setConverted((c) => ({ ...c, [q.id]: movement }));
  };

  const columns: Column<Quote>[] = [
    { key: 'id', label: 'ID', mono: true, sortable: true, sortValue: (q) => q.id, render: (q) => <span className="font-mono text-data text-text-2">{q.id}</span> },
    { key: 'customer', label: 'Customer', sortable: true, sortValue: (q) => q.customer, render: (q) => q.customer },
    { key: 'route', label: 'Route', render: (q) => <span className="font-display">{q.from} → {q.to}</span> },
    { key: 'cargo', label: 'Cargo', render: (q) => <span className="text-text-2">{q.weightT}t · {q.cargo.split('—')[0].trim()}</span> },
    { key: 'price', label: 'Price', mono: true, align: 'right', sortable: true, sortValue: (q) => q.price.amount, render: (q) => <span className="font-mono text-data">{fmtMoney(q.price)}</span> },
    { key: 'margin', label: 'Margin', align: 'right', sortable: true, sortValue: (q) => q.marginPct, render: (q) => <span className={cn('font-mono text-data', q.marginPct >= 12 ? 'text-ok' : 'text-danger')}>+{q.marginPct}%</span> },
    { key: 'win', label: 'Win %', align: 'right', sortable: true, sortValue: (q) => q.winProbability, render: (q) => <span className="inline-flex items-center gap-1.5"><ConfidenceRing value={q.winProbability} size={18} /><span className="font-mono text-[11px] text-text-2">{Math.round(q.winProbability)}</span></span> },
    {
      key: 'status', label: 'Status',
      render: (q) => {
        const col = effectiveCol(q);
        return <span className={cn('rounded-chip border px-1.5 py-0.5 text-micro uppercase', quoteStatusChip[col])}>{col}</span>;
      },
    },
    { key: 'activity', label: 'Last activity', render: (q) => <span className="text-text-3">{q.lastActivity ?? '—'}</span> },
  ];

  return (
    <div>
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-h1 text-text-1">Quotes</h1>
          <p className="mt-1 text-caption text-text-3">
            {tenant.name} · quote-to-dispatch pipeline · priced from memory ◈
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-chip border border-line-hairline p-0.5">
            {([['board', LayoutGrid], ['table', Table2]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('flex items-center gap-1.5 rounded px-2.5 py-1 text-micro uppercase transition-colors', view === v ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2')}
              >
                <Icon className="h-3.5 w-3.5" /> {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setInqModal(true)}
            className="flex items-center gap-2 rounded-chip border border-line-hairline px-3.5 py-2 text-small text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
          >
            <Inbox className="h-4 w-4" /> New inquiry
          </button>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 rounded-chip bg-ember px-3.5 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
          >
            <Plus className="h-4 w-4" /> New quote
            <span className="hidden items-center gap-1 text-[10px] opacity-75 md:flex">
              — or just say it <Command className="h-3 w-3" />K
            </span>
          </button>
        </div>
      </motion.div>

      {/* inquiries → triage into quotes */}
      <div className="mb-5">
        <InquiryInbox onQuoted={(quote) => setSelected(quote)} />
      </div>

      {/* pipeline */}
      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          body="Say `quote 12t Nairobi to Kampala Tuesday for Bidco` in ⌘K — or open the composer and I'll draft from memory."
          actionLabel="Open the composer"
          onAction={() => setComposerOpen(true)}
        />
      ) : view === 'board' ? (
        <PipelineBoard
          quotes={quotes}
          overrides={overrides}
          role={role}
          convertedMap={convertedMap}
          onOpenQuote={setSelected}
          onDropQuote={onDropQuote}
        />
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }}>
          <DataTable columns={columns} rows={quotes} rowKey={(q) => q.id} onRowClick={setSelected} selectedKey={selected?.id} />
        </motion.div>
      )}

      <LearningStrip />

      {/* composer */}
      <QuoteComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={(q, sent) => {
          if (!sent) pushToast({ title: `${q.id} saved to Draft`, tone: 'teal' });
        }}
      />

      {/* detail drawer */}
      <QuoteDrawer
        quote={selected}
        override={selected ? overrides[selected.id] : undefined}
        converted={selected ? converted[selected.id] ?? movements.find((m) => m.id === convertedMap[selected.id]) : undefined}
        onConvert={onConvert}
        onClose={() => setSelected(null)}
      />

      {/* lost-reason popover */}
      <AnimatePresence>
        {lostPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] flex items-center justify-center bg-canvas/60"
            onClick={() => setLostPrompt(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-[340px] rounded-modal border border-line-strong p-5 shadow-modal"
            >
              <div className="text-micro uppercase text-text-3">Why was {lostPrompt.id} lost?</div>
              <div className="mt-1 text-small text-text-2">Fraytline learns from every loss ◈</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {LOST_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => commitLost(r)}
                    className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:border-danger hover:text-danger"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* new inquiry modal */}
      {inqModal && (
        <NewInquiryModal
          customers={customers.map((c) => c.name)}
          onClose={() => setInqModal(false)}
          onSubmit={(input) => { addInquiry(input); setInqModal(false); }}
        />
      )}
    </div>
  );
}

// ---------- New inquiry intake ----------

function NewInquiryModal({
  customers, onClose, onSubmit,
}: {
  customers: string[];
  onClose: () => void;
  onSubmit: (input: { customer: string; from: string; to: string; cargo: string; weightT: number; channel: 'email' | 'phone' | 'whatsapp' | 'portal'; note?: string }) => void;
}) {
  const [customer, setCustomer] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cargo, setCargo] = useState('');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone' | 'whatsapp' | 'portal'>('email');
  const valid = customer.trim() && from.trim() && to.trim() && cargo.trim() && Number(weight) > 0;

  const field = (label: string, node: ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-micro uppercase tracking-wide text-text-3">{label}</span>
      {node}
    </label>
  );
  const inputCls = 'w-full rounded-card border border-line-hairline bg-surface-2/60 px-3 py-2 text-small text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-teal/50';

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="absolute right-6 top-16 w-[440px] rounded-panel border border-line-hairline bg-surface-1 p-5 shadow-modal"
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="text-body-strong text-text-1">Log a customer inquiry</div>
          <button onClick={onClose} className="rounded p-1 text-text-3 hover:text-text-1"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-caption text-text-3">From any channel — it lands in the inbox above, ready to quote.</p>
        <div className="space-y-3">
          {field('Customer', (
            <>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. East African Breweries" list="inq-customers" className={inputCls} />
              <datalist id="inq-customers">{customers.map((c) => <option key={c} value={c} />)}</datalist>
            </>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {field('From', <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Nairobi" className={inputCls} />)}
            {field('To', <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Mombasa" className={inputCls} />)}
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            {field('Cargo', <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Beer kegs" className={inputCls} />)}
            {field('Weight (t)', <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="16" inputMode="decimal" className={inputCls} />)}
          </div>
          {field('Channel', (
            <div className="flex gap-1.5">
              {(['email', 'phone', 'whatsapp', 'portal'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={cn(
                    'rounded-chip border px-2.5 py-1 text-caption capitalize transition-colors',
                    channel === c ? 'border-teal/50 bg-teal-dim text-teal' : 'border-line-hairline text-text-3 hover:text-text-2',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          ))}
          {field('Note (optional)', <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Needs Friday pickup" className={inputCls} />)}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            disabled={!valid}
            onClick={() => onSubmit({ customer: customer.trim(), from: from.trim(), to: to.trim(), cargo: cargo.trim(), weightT: Number(weight), channel, note: note.trim() || undefined })}
            className="rounded-chip bg-ember px-4 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi disabled:cursor-not-allowed disabled:opacity-40"
          >
            Log inquiry
          </button>
          <button onClick={onClose} className="rounded-chip px-3 py-2 text-small text-text-3 transition-colors hover:text-text-1">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}
