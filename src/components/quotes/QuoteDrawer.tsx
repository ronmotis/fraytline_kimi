import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { ArrowRight, Check, Eye, Send, X } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { Movement, Quote } from '@/store';
import MemoryChip from '@/components/MemoryChip';
import ConfidenceRing from '@/components/ConfidenceRing';
import MovementCard from '@/components/MovementCard';
import Materialize, { MatItem } from './Materialize';
import type { QuoteOverride } from './quoteUtils';
import { cn } from '@/lib/utils';

const PANEL_SPRING = { type: 'spring', stiffness: 220, damping: 26 } as const;
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Quote detail drawer (quotes.md §3, 520px right): engagement timeline,
 * counter-offer panel, and the Convert-to-movement Materialize payoff.
 */
export default function QuoteDrawer({
  quote,
  override,
  converted,
  onConvert,
  onClose,
}: {
  quote: Quote | null;
  override?: QuoteOverride;
  converted?: Movement;
  onConvert: (quote: Quote) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const pushToast = useStore((s) => s.pushToast);
  const checkPolicy = useStore((s) => s.checkPolicy);
  const laneFact = useStore((s) => s.memoryFacts.find((f) => f.id === quote?.memoryFactId));
  const [fold, setFold] = useState(false);

  useEffect(() => { setFold(false); }, [quote?.id]);

  const isWon = quote?.status === 'won' || override?.col === 'won';
  const negotiating = override?.col === 'negotiating';
  const counter = override?.counter;
  const avg = laneFact ? Number(laneFact.value) || quote!.price.amount : quote?.price.amount ?? 0;

  const startConvert = () => {
    if (!quote) return;
    setFold(true);
    setTimeout(() => onConvert(quote), 260);
  };

  const acceptCounter = () => {
    if (!quote || counter === undefined) return;
    const counterMargin = Math.round(((counter - quote.cost.amount) / quote.cost.amount) * 100);
    const check = checkPolicy({ kind: 'quote', marginPct: counterMargin });
    if (check.verdict === 'block') {
      pushToast({ title: 'Counter blocked by guardrail', body: check.reason, tone: 'danger' });
      return;
    }
    startConvert();
  };

  const sendCounter = () => {
    if (!quote || counter === undefined) return;
    const mid = Math.round((counter + quote.price.amount) / 2 / 10) * 10;
    pushToast({
      title: `Counter ${fmtMoney({ amount: mid, currency: quote.price.currency })} sent to ${quote.customer}`,
      body: 'governed · inside 07:00–21:00 window',
      tone: 'teal',
    });
  };

  const sendNudge = () => {
    if (!quote) return;
    pushToast({
      title: `Nudge sent to ${quote.customer}`,
      body: `${quote.id} · inside your 07:00–21:00 EAT window`,
      tone: 'ok',
    });
  };

  return (
    <AnimatePresence>
      {quote && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[75] bg-canvas/50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 520 }}
            animate={{ x: 0 }}
            exit={{ x: 520 }}
            transition={PANEL_SPRING}
            className="glass fixed bottom-0 right-0 top-14 z-[76] flex w-full max-w-[520px] flex-col border-l border-line-strong shadow-modal"
          >
            <div className="flex items-center justify-between border-b border-line-hairline px-5 py-4">
              <div>
                <span className="font-mono text-data text-text-3">{quote.id}</span>
                <div className="mt-0.5 font-display text-h2 text-text-1">
                  {quote.from} <span className="text-text-3">→</span> {quote.to}
                </div>
                <div className="mt-0.5 text-caption text-text-2">{quote.customer} · {quote.cargo}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={onClose} className="rounded-chip p-2 text-text-3 transition-colors hover:text-text-1">
                  <X className="h-4 w-4" />
                </button>
                <ConfidenceRing value={quote.winProbability} size={36} showLabel />
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* price row */}
              <div className="flex items-center justify-between rounded-card border border-line-hairline bg-surface-1 p-4">
                <div>
                  <div className="text-micro uppercase text-text-3">Quoted</div>
                  <div className="mt-1 font-mono text-data-lg text-text-1">{fmtMoney(quote.price)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {quote.memoryFactId && <MemoryChip factId={quote.memoryFactId} />}
                  <span className={cn('rounded-chip px-1.5 py-0.5 font-mono text-[11px]', quote.marginPct >= 12 ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger')}>
                    margin +{quote.marginPct}%
                  </span>
                </div>
              </div>

              {/* engagement timeline */}
              <div>
                <div className="mb-2 text-micro uppercase text-text-3">Engagement</div>
                <div className="space-y-2.5">
                  {[
                    quote.sentAt ? { icon: Send, text: `Sent ${quote.sentAt}`, tone: 'text-text-2' } : { icon: Send, text: quote.lastActivity ?? 'Drafted by Conductor', tone: 'text-text-3' },
                    ...(quote.openCount > 0
                      ? [{ icon: Eye, text: `Opened ${quote.openCount}× — tracking pixel live`, tone: 'text-warn' }]
                      : []),
                    ...(quote.lastActivity && quote.sentAt ? [{ icon: Check, text: quote.lastActivity, tone: 'text-text-2' }] : []),
                  ].map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.3, ease: EASE }}
                      className="flex items-center gap-2.5 text-small"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-hairline bg-surface-2">
                        <ev.icon className="h-3 w-3 text-text-3" />
                      </span>
                      <span className={ev.tone}>{ev.text}</span>
                    </motion.div>
                  ))}
                </div>

                {quote.openCount >= 2 && !isWon && (
                  <div className="mt-3 rounded-card border border-teal/25 bg-teal-dim/50 p-3">
                    <div className="text-caption text-teal">
                      Conductor — {quote.openCount} opens in 48h historically closes within 2 days
                      {laneFact && <> ◈ {laneFact.confidence}%</>}. Nudge drafted.
                    </div>
                    <button
                      onClick={sendNudge}
                      className="mt-2 rounded-chip border border-teal/40 px-2.5 py-1 text-caption font-medium text-teal transition-colors hover:border-teal"
                    >
                      Send nudge
                    </button>
                  </div>
                )}
              </div>

              {/* counter-offer panel */}
              {negotiating && counter !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="rounded-card border border-warn/30 bg-warn/5 p-4"
                >
                  <div className="text-micro uppercase text-warn">Counter-offer</div>
                  <div className="mt-2 flex items-center gap-4 font-mono text-data">
                    <span className="text-warn">theirs {fmtMoney({ amount: counter, currency: quote.price.currency })}</span>
                    <span className="text-text-3">vs</span>
                    <span className="text-text-1">yours {fmtMoney(quote.price)}</span>
                  </div>
                  <div className="mt-2.5 rounded-chip border border-teal/25 bg-teal-dim/60 px-2.5 py-1.5 text-caption text-teal">
                    Accept — {fmtMoney({ amount: counter, currency: quote.price.currency })} is{' '}
                    {(((counter - avg) / avg) * 100).toFixed(1)}% vs avg and the Tuesday backhaul is confirmed ◈
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={acceptCounter}
                      className="rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
                    >
                      Accept
                    </button>
                    <button
                      onClick={sendCounter}
                      className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1"
                    >
                      Counter {fmtMoney({ amount: Math.round((counter + quote.price.amount) / 2 / 10) * 10, currency: quote.price.currency })}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* convert payoff */}
              {converted ? (
                <Materialize className="bg-surface-1 p-4">
                  <MatItem>
                    <div className="mb-2 text-micro uppercase text-teal">Materialized as a Movement</div>
                    <MovementCard movement={converted} />
                  </MatItem>
                  <MatItem className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/movements/${converted.id}`)}
                      className="flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1"
                    >
                      Open movement <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => navigate('/dispatch', { state: { assign: converted.id } })}
                      className="flex items-center gap-1.5 rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
                    >
                      Assign now <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </MatItem>
                </Materialize>
              ) : isWon ? (
                <motion.div
                  animate={fold ? { scaleY: 0.6, opacity: 0.6 } : { scaleY: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  style={{ transformOrigin: 'top' }}
                >
                  <button
                    onClick={startConvert}
                    className="flex w-full items-center justify-center gap-2 rounded-card bg-ember px-4 py-3.5 text-body-strong text-canvas shadow-glow-ember transition-colors hover:bg-ember-hi"
                  >
                    Convert to movement <ArrowRight className="h-4 w-4" />
                  </button>
                  <div className="mt-2 text-center text-[11px] text-text-3">
                    materializes a Movement · hands off to Dispatch · logged
                  </div>
                </motion.div>
              ) : null}

              <div className="text-[10px] text-text-3">logged · reversible where possible</div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
