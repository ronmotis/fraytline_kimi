import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Minus, Plus, Send, X } from 'lucide-react';
import {
  useStore, useActiveTenant, useTenantFacts, fmtMoney, ownerName,
} from '@/store';
import type { Doc, PriceSuggestion, Quote } from '@/store';
import MemoryChip from '@/components/MemoryChip';
import ConfidenceRing from '@/components/ConfidenceRing';
import DocChip from '@/components/DocChip';
import Materialize, { MatItem } from './Materialize';
import { DAY_DATES, defaultPrice, parseBrief, pctAboveAvg, winProbability } from './quoteUtils';
import type { BriefParse } from './quoteUtils';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const PANEL_SPRING = { type: 'spring', stiffness: 220, damping: 26 } as const;

/** rough country map for border reveal (progressive complexity) */
const COUNTRY: Record<string, string> = {
  nairobi: 'KE', mombasa: 'KE', kampala: 'UG', kigali: 'RW', juba: 'SS',
  accra: 'GH', kumasi: 'GH', tema: 'GH', 'tema port': 'GH', takoradi: 'GH', ouagadougou: 'BF',
};
const crossesBorder = (from: string, to: string) =>
  (COUNTRY[from.toLowerCase()] ?? '?') !== (COUNTRY[to.toLowerCase()] ?? '?');

function buildDocs(tenantId: string, crosses: boolean): Doc[] {
  if (tenantId === 'savannah') {
    return crosses
      ? [
          { id: 'cd-ecowas', name: 'ECOWAS Brown Card', status: 'pending' },
          { id: 'cd-transit', name: 'Burkina Transit Declaration', status: 'missing' },
        ]
      : [{ id: 'cd-waybill', name: 'Waybill', status: 'verified' }];
  }
  return crosses
    ? [
        { id: 'cd-bond', name: 'EAC bond', status: 'pending' },
        { id: 'cd-comesa', name: 'COMESA yellow card', status: 'verified' },
        { id: 'cd-c17', name: 'C17', status: 'verified' },
      ]
    : [{ id: 'cd-ci', name: 'Commercial invoice', status: 'pending' }];
}

/** Thinking dots (§6.2.2) */
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-teal"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export default function QuoteComposer({
  open,
  initialText,
  onClose,
  onSent,
}: {
  open: boolean;
  initialText?: string;
  onClose: () => void;
  onSent: (quote: Quote, sent: boolean) => void;
}) {
  const tenant = useActiveTenant();
  const customers = useStore((s) => s.customers.filter((c) => c.tenantId === s.activeTenantId));
  const facts = useTenantFacts();
  const suggestPrice = useStore((s) => s.suggestPrice);
  const checkPolicy = useStore((s) => s.checkPolicy);
  const addQuoteFromIntent = useStore((s) => s.addQuoteFromIntent);
  const sendQuote = useStore((s) => s.sendQuote);

  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'ready'>('idle');
  const [parsed, setParsed] = useState<BriefParse | null>(null);
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [price, setPrice] = useState(0);
  const [whyOpen, setWhyOpen] = useState(false);
  const [tone, setTone] = useState<'concise' | 'warm'>('concise');
  const [message, setMessage] = useState('');
  const [messageTouched, setMessageTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const thinkRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // seed input when opened
  useEffect(() => {
    if (open) {
      setText(initialText ?? '');
      setSending(false);
      setWhyOpen(false);
      setMessageTouched(false);
      if (!initialText) { setPhase('idle'); setParsed(null); setSuggestion(null); }
    }
  }, [open, initialText]);

  // live extraction: debounce 250ms → Thinking 400ms → chips pop
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    clearTimeout(thinkRef.current);
    if (!text.trim()) { setPhase('idle'); setParsed(null); setSuggestion(null); return; }
    debounceRef.current = setTimeout(() => {
      setPhase('thinking');
      thinkRef.current = setTimeout(() => {
        const p = parseBrief(text, customers);
        setParsed(p);
        const s = p?.from && p?.to ? suggestPrice({ from: p.from, to: p.to }, p.cargo) : null;
        setSuggestion(s);
        setPhase(p ? 'ready' : 'idle');
      }, 400);
    }, 250);
    return () => { clearTimeout(debounceRef.current); clearTimeout(thinkRef.current); };
  }, [text, open, customers, suggestPrice]);

  const avg = suggestion?.price.amount ?? 0;
  const currency = suggestion?.price.currency ?? (tenant.id === 'savannah' ? 'GHS' : 'USD');

  // reset price when a new suggestion lands
  useEffect(() => {
    if (suggestion) setPrice(defaultPrice(suggestion.price.amount));
  }, [suggestion]);

  const laneFact = useStore((s) => s.memoryFacts.find((f) => f.id === suggestion?.factId));
  const customerFact = useMemo(
    () => facts.find((f) => f.kind === 'customer' && parsed?.customer && f.label.toLowerCase().includes(parsed.customer.split(' ')[0].toLowerCase())),
    [facts, parsed],
  );
  const borderFact = useMemo(() => facts.find((f) => f.id === 'f-border-pref'), [facts]);
  const winrateFact = useMemo(() => facts.find((f) => f.kind === 'pricing'), [facts]);

  const crosses = parsed?.from && parsed?.to ? crossesBorder(parsed.from, parsed.to) : false;
  const cost = Math.round(avg * 0.85);
  const marginPct = avg > 0 ? Math.round(((price - cost) / cost) * 100) : 0;
  const win = avg > 0 ? winProbability(price, avg, suggestion?.confidence ?? 0) : 0;
  const guardrail = checkPolicy({ kind: 'quote', marginPct });
  const lowMemory = !!suggestion && suggestion.confidence < 60;
  const step = Math.max(10, Math.round(avg * 0.025));
  const pickupLabel = parsed?.day ? DAY_DATES[parsed.day.toLowerCase()] ?? parsed.day : 'TBD';

  // customer-facing message draft (operator's tone ◈ learned)
  useEffect(() => {
    if (messageTouched || !parsed || !suggestion) return;
    const to = parsed.to || 'destination';
    const valueLine = crosses
      ? tenant.id === 'savannah' ? 'Paga crossing is planned into the schedule.' : 'Busia crossing averaging 3.2h this month.'
      : 'Direct run — no border on this lane.';
    const msg = tone === 'concise'
      ? `Hi ${parsed.customer ?? 'there'} — ${parsed.from} → ${to}, ${parsed.weightT}t, pickup ${pickupLabel}. ${fmtMoney({ amount: price, currency })} all-in, valid 72h. ${valueLine} — ${ownerName(tenant.id)}`
      : `Hello ${parsed.customer ?? 'there'}, thanks for the request. We can move ${parsed.weightT}t from ${parsed.from} to ${to} with pickup ${pickupLabel} for ${fmtMoney({ amount: price, currency })} all-in — this rate holds for 72 hours. ${valueLine} Happy to adjust timing to suit your dock. — ${ownerName(tenant.id)}, ${tenant.name}`;
    setMessage(msg);
  }, [parsed, suggestion, price, tone, crosses, tenant, pickupLabel, currency, messageTouched]);

  const band = suggestion?.band ?? [Math.round(avg * 0.9), Math.round(avg * 1.1)];
  const bandMin = Math.round(band[0] * 0.96);
  const bandMax = Math.round(band[1] * 1.04);
  const markerPct = Math.min(100, Math.max(0, ((price - bandMin) / (bandMax - bandMin)) * 100));
  const avgPct = Math.min(100, Math.max(0, ((avg - bandMin) / (bandMax - bandMin)) * 100));

  const canSend = phase === 'ready' && parsed?.from && parsed?.to && guardrail.verdict !== 'block';

  const commit = (send: boolean) => {
    if (!parsed || !canSend) return;
    const adjusted: PriceSuggestion = {
      ...(suggestion ?? { band: band as [number, number], reasoning: 'Priced manually', confidence: 30 }),
      price: { amount: price, currency },
    };
    const quote = addQuoteFromIntent(
      {
        from: parsed.from, to: parsed.to, weightT: parsed.weightT,
        customer: parsed.customer, cargo: parsed.cargo,
        pickupDate: parsed.day ? pickupLabel : undefined,
      },
      adjusted,
    );
    if (send) {
      setSending(true);
      setTimeout(() => {
        sendQuote(quote.id);
        onSent(quote, true);
        onClose();
      }, 650);
    } else {
      onSent(quote, false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto px-4 pb-10 pt-[8vh]"
          style={{ background: 'rgba(14,13,11,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: -8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -8, opacity: 0 }}
            transition={PANEL_SPRING}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-[980px] rounded-modal border border-line-strong p-6 shadow-modal"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-micro uppercase text-teal">Conductor · quote composer</div>
                <h2 className="mt-1 font-display text-h2 text-text-1">Draft from memory, priced with evidence</h2>
              </div>
              <button onClick={onClose} className="rounded-chip p-2 text-text-3 transition-colors hover:text-text-1" title="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[55%_1fr]">
              {/* LEFT — natural-language brief */}
              <div>
                <label className="text-micro uppercase text-text-3">Say it like you'd text it</label>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="12t general cargo, Nairobi → Kampala, pickup Tuesday, for Bidco"
                  className="mt-2 w-full resize-none rounded-card border border-line-hairline bg-surface-2 p-4 font-display text-h3 text-text-1 placeholder:text-text-3 focus:border-teal focus:shadow-glow-teal focus:outline-none"
                />

                <div className="mt-3 min-h-[28px]">
                  {phase === 'thinking' && (
                    <div className="flex items-center gap-2 text-caption text-teal">
                      <ThinkingDots /> Conductor is extracting…
                    </div>
                  )}
                  {phase === 'ready' && parsed && (
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        parsed.from && parsed.to
                          ? { label: `lane: ${parsed.from}→${parsed.to}`, ok: !lowMemory, suffix: lowMemory ? undefined : '✓ known' }
                          : null,
                        { label: `cargo: ${parsed.weightT}t FTL`, ok: true },
                        parsed.customer
                          ? { label: `customer: ${parsed.customer}`, ok: parsed.customer !== parsed.customerRaw, suffix: parsed.customer !== parsed.customerRaw ? '✓' : undefined }
                          : null,
                        parsed.day ? { label: `pickup: ${pickupLabel}`, ok: true } : null,
                      ].filter(Boolean).map((chip, i) => (
                        <motion.span
                          key={(chip as { label: string }).label}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ ...PANEL_SPRING, delay: i * 0.06 }}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-chip border px-2 py-1 text-caption',
                            (chip as { ok: boolean }).ok
                              ? 'border-teal/30 bg-teal-dim text-teal'
                              : 'border-dashed border-warn/50 bg-warn/10 text-warn',
                          )}
                        >
                          {(chip as { label: string }).label}
                          {(chip as { suffix?: string }).suffix && <span className="text-[10px] opacity-80">{(chip as { suffix?: string }).suffix}</span>}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>

                {lowMemory && suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="mt-3 rounded-card border border-dashed border-warn/50 bg-warn/5 p-3 text-caption text-warn"
                  >
                    {parsed?.to} corridor — only {laneFact?.evidenceCount ?? 2} moves in memory ◈ {suggestion.confidence}%.
                    Want me to ask instead of assume? Confirm a rate and I'll learn it.
                  </motion.div>
                )}

                <div className="mt-4 rounded-card border border-line-hairline bg-surface-1 p-3 text-caption text-text-3">
                  <span className="text-teal">◈</span> Every edit is a correction — Conductor notes what felt right
                  and confirms it against the win/loss outcome.
                </div>
              </div>

              {/* RIGHT — live draft */}
              <div>
                {phase !== 'ready' || !parsed?.from || !parsed?.to ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-card border border-dashed border-line-hairline p-8 text-center text-caption text-text-3">
                    {phase === 'thinking'
                      ? <span className="flex items-center gap-2 text-teal"><ThinkingDots /> drafting from memory…</span>
                      : 'Type a lane, cargo and customer — the draft assembles here.'}
                  </div>
                ) : (
                  <Materialize key={`${parsed.from}-${parsed.to}-${parsed.customer ?? ''}-${tenant.id}`} className="bg-surface-1 p-4">
                    {/* price block */}
                    <MatItem>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-micro uppercase text-text-3">Suggested price ◈ memory</div>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              onClick={() => setPrice((p) => Math.max(0, p - step))}
                              className="rounded-chip border border-line-hairline p-1 text-text-3 transition-colors hover:border-line-strong hover:text-text-1"
                              title={`−${step}`}
                            ><Minus className="h-3.5 w-3.5" /></button>
                            <motion.span
                              key={price}
                              initial={{ opacity: 0.4, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, ease: EASE }}
                              className="font-mono text-data-lg text-text-1"
                            >
                              {fmtMoney({ amount: price, currency })}
                            </motion.span>
                            <button
                              onClick={() => setPrice((p) => p + step)}
                              className="rounded-chip border border-line-hairline p-1 text-text-3 transition-colors hover:border-line-strong hover:text-text-1"
                              title={`+${step}`}
                            ><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <ConfidenceRing value={suggestion?.confidence ?? 30} size={40} showLabel />
                          <span className="text-[9px] uppercase tracking-[0.09em] text-text-3">memory conf.</span>
                        </div>
                      </div>

                      {/* range band */}
                      <div className="mt-3">
                        <div className="relative h-1.5 rounded-full bg-surface-3">
                          <div className="absolute inset-y-0 rounded-full bg-teal/25" style={{ left: `${avgPct - 4}%`, width: '8%' }} />
                          <motion.div
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-ember shadow-glow-ember"
                            animate={{ left: `${markerPct}%` }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        </div>
                        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-text-3">
                          <span>{fmtMoney({ amount: bandMin, currency })}</span>
                          <span className="text-teal">◈ avg {fmtMoney({ amount: avg, currency })}</span>
                          <span>{fmtMoney({ amount: bandMax, currency })}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-chip px-1.5 py-0.5 font-mono text-[11px]', marginPct >= 12 ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger')}>
                          margin +{marginPct}%
                        </span>
                        <span className="flex items-center gap-1.5 rounded-chip border border-line-hairline px-2 py-0.5 text-[11px] text-text-2">
                          win {win}% <ConfidenceRing value={win} size={16} />
                        </span>
                        <span className={cn('rounded-chip px-1.5 py-0.5 text-[11px]', guardrail.verdict === 'block' ? 'bg-danger/10 text-danger' : 'bg-teal-dim text-teal')}>
                          {guardrail.verdict === 'block' ? '✗ guardrail' : '✓ guardrail'}
                        </span>
                      </div>
                    </MatItem>

                    {/* why this price */}
                    <MatItem className="mt-3">
                      <button
                        onClick={() => setWhyOpen((v) => !v)}
                        className="flex items-center gap-1 text-caption text-teal transition-colors hover:text-text-1"
                      >
                        Why this price
                        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', whyOpen && 'rotate-180')} />
                      </button>
                      <AnimatePresence>
                        {whyOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={PANEL_SPRING}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-1.5 rounded-card border border-line-hairline bg-surface-2 p-3 text-caption text-text-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-teal">1.</span>
                                Your corridor average: {fmtMoney({ amount: avg, currency })}
                                {laneFact && <MemoryChip factId={laneFact.id} />}
                                <span className="text-text-3">({laneFact?.evidenceCount ?? 0} moves · 90 days)</span>
                              </div>
                              {customerFact && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-teal">2.</span>
                                  {parsed.day ?? 'Pickup'} fits <MemoryChip factId={customerFact.id} />
                                </div>
                              )}
                              {crosses && tenant.id === 'meridian' && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-teal">3.</span>
                                  Backhaul available Thursday → −$80 repositioning
                                  {borderFact && <MemoryChip factId={borderFact.id} />}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-teal">4.</span>
                                Guardrail check: {guardrail.reason} {guardrail.verdict === 'block' ? '✗' : '✓'}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-teal">5.</span>
                                Win-probability at this price: <span className="font-mono text-text-1">{win}%</span>
                                ({pctAboveAvg(price, avg)}% vs avg · band ≤+5% → 71%, ≥+15% → 22%)
                                {winrateFact && <MemoryChip factId={winrateFact.id} />}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </MatItem>

                    {/* terms + docs */}
                    <MatItem className="mt-3 border-t border-line-hairline pt-3">
                      <div className="text-caption text-text-2">
                        net-{customers.find((c) => c.name === parsed.customer)?.paymentDays ?? 30} ◈ {parsed.customer ?? 'standard'} terms
                        · validity 72h
                      </div>
                      <div className="mt-1 text-caption text-text-3">
                        includes: {crosses ? (tenant.id === 'savannah' ? 'ECOWAS formalities, tolls, 1 border (Paga)' : 'COMESA, tolls, 1 border (Busia)') : 'tolls, loading supervision'}
                        {' '}· excludes: {crosses ? 'bond renewal' : 'demurrage beyond 4h'}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {buildDocs(tenant.id, crosses).map((d) => <DocChip key={d.id} doc={d} />)}
                        <span className="text-[10px] text-text-3">◈ from your document habits on this lane</span>
                      </div>
                    </MatItem>

                    {/* message draft */}
                    <MatItem className="mt-3 border-t border-line-hairline pt-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-micro uppercase text-text-3">Message draft ◈ your tone</span>
                        <div className="flex rounded-chip border border-line-hairline p-0.5">
                          {(['concise', 'warm'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => { setTone(t); setMessageTouched(false); }}
                              className={cn('rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.09em] transition-colors', tone === t ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2')}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setMessageTouched(true); }}
                        rows={3}
                        className="w-full resize-none rounded-card border border-line-hairline bg-surface-2 p-3 text-small text-text-1 focus:border-teal focus:outline-none"
                      />
                    </MatItem>

                    {/* actions */}
                    <MatItem className="mt-4 flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={!canSend || sending}
                        onClick={() => commit(true)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-chip px-4 py-2 text-small font-medium transition-colors',
                          canSend ? 'bg-ember text-canvas hover:bg-ember-hi' : 'cursor-not-allowed bg-surface-3 text-text-3',
                        )}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sending ? 'Sending…' : 'Send quote'}
                      </motion.button>
                      <button
                        disabled={!canSend}
                        onClick={() => commit(false)}
                        className="rounded-chip border border-line-strong px-4 py-2 text-small text-text-2 transition-colors hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save draft
                      </button>
                      <span className="ml-auto text-[10px] text-text-3">
                        {sending ? 'tracking on · logged' : 'sends with open-tracking · logged to Ledger'}
                      </span>
                    </MatItem>
                  </Materialize>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
