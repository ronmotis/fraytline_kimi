import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, FileText, Route, Search, Sparkles, Truck } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { IntentResult } from '@/store';
import MemoryChip from './MemoryChip';
import ConfidenceRing from './ConfidenceRing';
import { cn } from '@/lib/utils';

interface ResultItem {
  icon: typeof FileText;
  title: string;
  detail?: React.ReactNode;
  hint?: string;
  run: () => void;
}

function ThinkingLine() {
  return (
    <div className="px-5 pb-4 pt-1">
      <div className="thinking-line h-px w-full" />
      <div className="mt-2 text-caption text-teal">Conductor is thinking…</div>
    </div>
  );
}

/** ⌘K glass modal (§9.1) — verb parsing → structured results → governed execution. */
export default function CommandBar() {
  const open = useStore((s) => s.commandBarOpen);
  const setOpen = useStore((s) => s.setCommandBarOpen);
  const parseIntent = useStore((s) => s.parseIntent);
  const addQuoteFromIntent = useStore((s) => s.addQuoteFromIntent);
  const sendQuote = useStore((s) => s.sendQuote);
  const teachFact = useStore((s) => s.teachFact);
  const approveAction = useStore((s) => s.approveAction);
  const assignDriver = useStore((s) => s.assignDriver);
  const postCapacity = useStore((s) => s.postCapacity);
  const fleet = useStore((s) => s.fleet);
  const activeTenantId = useStore((s) => s.activeTenantId);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<IntentResult | null>(null);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(''); setResult(null); setSelected(0); setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) { setResult(null); setThinking(false); return; }
    setThinking(true);
    const debounce = setTimeout(() => {
      const r = parseIntent(query);
      const thinkMs = 300 + Math.random() * 400;
      setTimeout(() => { setResult(r); setThinking(false); setSelected(0); }, thinkMs);
    }, 200);
    return () => clearTimeout(debounce);
  }, [query, open, parseIntent]);

  const close = () => setOpen(false);

  const items: ResultItem[] = useMemo(() => {
    if (!result) return [];
    switch (result.type) {
      case 'quote': {
        const { draft, suggestion } = result;
        return [{
          icon: FileText,
          title: `Quote draft · ${draft.from || '?'} → ${draft.to || '?'} · ${draft.weightT}t${draft.customer ? ` · ${draft.customer}` : ''}`,
          detail: suggestion ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-data text-ember">{fmtMoney(suggestion.price)}</span>
              <span className="text-caption text-text-3">band {suggestion.band.map((b) => `$${b.toLocaleString()}`).join('–')}</span>
              <ConfidenceRing value={suggestion.confidence} size={18} />
              {suggestion.factId && <MemoryChip factId={suggestion.factId} />}
              <span className="w-full text-caption text-text-3">{suggestion.reasoning}</span>
            </span>
          ) : <span className="text-caption text-text-3">Give a lane (e.g. “quote 12t nairobi to kampala tuesday for bidco”)</span>,
          hint: '⏎ create draft',
          run: () => { if (draft.from && draft.to) { addQuoteFromIntent(draft, suggestion); close(); } },
        }, {
          icon: Sparkles,
          title: 'Create & send immediately',
          hint: suggestion ? 'inside margin guardrail' : undefined,
          run: () => { if (draft.from && draft.to) { const q = addQuoteFromIntent(draft, suggestion); sendQuote(q.id); close(); } },
        }];
      }
      case 'track':
        return [{
          icon: Truck,
          title: `${result.vehicle.plate} · ${result.vehicle.model}`,
          detail: <span className="text-caption text-text-2">{result.vehicle.location} · {result.vehicle.status}{result.movement ? ` · on ${result.movement.id} ${result.movement.from} → ${result.movement.to}` : ''}</span>,
          hint: result.movement ? '⏎ open movement' : undefined,
          run: () => { if (result.movement) { navigate(`/movements/${result.movement.id}`); close(); } },
        }];
      case 'teach':
        return [{
          icon: Brain,
          title: `Teach: “${result.text}”`,
          detail: <span className="text-caption text-text-3">Materializes into Business Memory at 55% confidence — grows with evidence.</span>,
          hint: '⏎ confirm & learn',
          run: () => { teachFact({ label: result.text }); close(); },
        }];
      case 'approve': {
        const rows: ResultItem[] = result.actions.map((a) => ({
          icon: Sparkles,
          title: a.title,
          detail: <span className="text-caption text-text-3">{a.context}{a.amount ? ` · ${fmtMoney(a.amount)}` : ''}</span>,
          hint: '⏎ approve',
          run: () => { approveAction(a.id); close(); },
        }));
        if (result.actions.length > 1) rows.push({
          icon: Sparkles,
          title: `Approve all ${result.actions.length}${result.batchNote ? ` (${result.batchNote})` : ''}`,
          detail: <span className="text-caption text-text-3">Each passes the guardrail engine; all logged to Ledger with Undo.</span>,
          hint: '⏎ batch approve',
          run: () => { result.actions.forEach((a) => approveAction(a.id)); close(); },
        });
        if (rows.length === 0) rows.push({ icon: Sparkles, title: 'No pending approvals match', run: () => close() });
        return rows;
      }
      case 'find':
        return result.results.length > 0
          ? result.results.map((r) => ({
              icon: r.kind === 'movement' ? Route : r.kind === 'quote' ? FileText : Brain,
              title: r.label,
              hint: '⏎ open',
              run: () => {
                navigate(r.kind === 'movement' ? `/movements/${r.id}` : r.kind === 'quote' ? '/quotes' : '/memory');
                close();
              },
            }))
          : [{ icon: Search, title: 'Nothing matched', detail: <span className="text-caption text-text-3">Try a movement ID, customer, lane or fact.</span>, run: () => {} }];
      case 'dispatch': {
        if (!result.movement) return [{ icon: Truck, title: 'Nothing needs dispatch', run: () => close() }];
        const vehicles = fleet.filter((v) => v.tenantId === activeTenantId && v.status === 'available');
        return vehicles.length > 0
          ? vehicles.map((v) => ({
              icon: Truck,
              title: `Assign ${v.plate} · ${v.model} → ${result.movement!.id}`,
              detail: <span className="text-caption text-text-3">{result.movement!.from} → {result.movement!.to} · pickup {result.movement!.pickupIn ?? 'TBD'} · compatible with {result.movement!.weightT}t</span>,
              hint: '⏎ assign',
              run: () => { assignDriver(result.movement!.id, v.id); close(); },
            }))
          : [{ icon: Truck, title: 'No available vehicles', detail: <span className="text-caption text-text-3">Check the fleet timeline in Dispatch.</span>, run: () => { navigate('/dispatch'); close(); } }];
      }
      case 'summarize':
        return [{ icon: Sparkles, title: result.text, detail: <span className="text-caption text-text-3">Full picture lives on Today.</span>, hint: '⏎ go to Today', run: () => { navigate('/today'); close(); } }];
      case 'post-capacity':
        return [{
          icon: Truck,
          title: `Post capacity · ${result.draft.from} → ${result.draft.to} · ${result.draft.date}`,
          detail: <span className="text-caption text-text-3">Governed posting — reversible until a bid is accepted.</span>,
          hint: '⏎ post to Exchange',
          run: () => { postCapacity({ ...result.draft, vehiclePlate: result.draft.vehiclePlate ?? 'KDJ 482T' }); close(); },
        }];
      default:
        return [{ icon: Search, title: result.text, detail: <span className="text-caption text-text-3">quote · track · teach · approve · summarize · post capacity · find</span>, run: () => {} }];
    }
  }, [result, fleet, activeTenantId, addQuoteFromIntent, sendQuote, teachFact, approveAction, assignDriver, postCapacity, navigate]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[selected]?.run(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-canvas/60 backdrop-blur-[8px]" onClick={close} />
          <motion.div
            className="glass absolute left-1/2 top-[18vh] w-[640px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-modal border border-line-strong shadow-modal"
            initial={{ scale: 0.96, y: -8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          >
            <div className="flex items-center gap-3 border-b border-line-hairline px-5 py-4">
              <Sparkles className="h-4 w-4 shrink-0 text-teal" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask or act…  quote 12t nairobi to kampala tuesday for bidco"
                className="w-full bg-transparent text-body text-text-1 placeholder:text-text-3 focus:outline-none"
                style={{ caretColor: 'var(--teal)' }}
              />
              <kbd className="rounded border border-line-hairline px-1.5 py-0.5 font-mono text-[10px] text-text-3">esc</kbd>
            </div>

            {thinking && <ThinkingLine />}

            {!thinking && items.length > 0 && (
              <div className="max-h-[46vh] overflow-y-auto p-2">
                {items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={item.run}
                      onMouseEnter={() => setSelected(i)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-card px-3 py-2.5 text-left transition-colors',
                        selected === i ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-small text-text-1">{item.title}</span>
                        {item.detail && <span className="mt-1 block">{item.detail}</span>}
                      </span>
                      {item.hint && <span className="shrink-0 font-mono text-[10px] text-text-3">{item.hint}</span>}
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-line-hairline px-5 py-2.5 text-micro uppercase text-text-3">
              ↑↓ navigate · ⏎ act · esc close · every action logs to Ledger
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
