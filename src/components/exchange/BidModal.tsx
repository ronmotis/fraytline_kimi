// Governed bidding modal (exchange.md §2): editable amount, live guardrail check
// against the bid floor, reasoning trace, then placeBid (auto-executes inside
// policy, enqueues an approval outside it — implemented by the store).
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { useStore, fmtMoney, ownerName } from '@/store';
import type { ExchangeLoad } from '@/store';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';
import { moneyBand, useBidFloor } from './exchangeData';

export default function BidModal({ load, onClose }: { load: ExchangeLoad; onClose: () => void }) {
  const suggestPrice = useStore((s) => s.suggestPrice);
  const placeBid = useStore((s) => s.placeBid);
  const checkPolicy = useStore((s) => s.checkPolicy);
  const pushToast = useStore((s) => s.pushToast);
  const autonomy = useStore((s) => s.autonomy.exchange ?? 'Approve');
  const role = useStore((s) => s.role);
  const tenantId = useStore((s) => s.activeTenantId);
  const floor = useBidFloor();

  const suggestion = useMemo(() => suggestPrice({ from: load.from, to: load.to }, load.cargo), [suggestPrice, load]);
  const [amount, setAmount] = useState(suggestion.price.amount);

  const sym = load.price.currency === 'GHS' ? 'GH₵' : '$';
  const margin = amount - Math.round(suggestion.price.amount * 0.82);
  const belowFloor = amount < floor.min;
  const engineCheck = checkPolicy({ kind: 'bid', amountUsd: amount, lane: `${load.from}→${load.to}` });
  const willEscalate = belowFloor || engineCheck.verdict === 'escalate' || role === 'Dispatcher';
  const lane = `${load.from}→${load.to}`;

  const submit = () => {
    if (role === 'Dispatcher') {
      // dispatcher bids always route through the owner (role lens, exchange.md)
      pushToast({
        title: `Bid ${sym}${amount.toLocaleString()} proposed`,
        body: `${lane} · awaiting ${ownerName(tenantId)} · logged to Ledger`,
        tone: 'ember',
        ledgerLink: true,
      });
      onClose();
      return;
    }
    // store loads go through the real governed path (ledger + approval queue)
    const res = placeBid(load.id, amount);
    if (res.verdict === 'block' && res.reason === 'Load not found') {
      // page-local board card — same governance choreography, page-local state
      if (willEscalate) {
        pushToast({
          title: `Bid ${sym}${amount.toLocaleString()} sent for approval`,
          body: `${lane} · below your ${floor.label} floor · awaiting ${ownerName(tenantId)} · logged to Ledger`,
          tone: 'ember',
          ledgerLink: true,
        });
      } else {
        pushToast({
          title: 'Bid placed inside guardrails',
          body: `${lane} · ${sym}${amount.toLocaleString()} · logged to Ledger`,
          tone: 'teal',
          ledgerLink: true,
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[16vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(14,13,11,0.6)] backdrop-blur-[8px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass relative w-[520px] max-w-[calc(100vw-32px)] rounded-modal border border-line-strong p-6 shadow-modal"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-text-3 transition-colors hover:text-text-1">
          <X className="h-4 w-4" />
        </button>

        <div className="text-micro uppercase text-text-3">Governed bid · Exchange autonomy: {autonomy}</div>
        <div className="mt-1.5 font-display text-h2 text-text-1">
          {load.from} <span className="text-text-3">→</span> {load.to}
        </div>
        <div className="mt-1 text-caption text-text-2">
          {load.cargo} · {load.date} · posted by {load.poster}
        </div>

        {/* amount */}
        <div className="mt-5">
          <label className="text-caption text-text-3">Your bid ({load.price.currency})</label>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex flex-1 items-center rounded-card border border-line-strong bg-surface-2 px-3 py-2.5 focus-within:border-teal">
              <span className="mr-2 font-mono text-data text-text-3">{sym}</span>
              <input
                type="number"
                value={amount}
                min={0}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-transparent font-mono text-data-lg text-text-1 outline-none"
              />
            </div>
            <div className="text-right">
              <div className="font-mono text-data text-text-2">{moneyBand(suggestion.band, load.price)}</div>
              <div className="text-caption text-text-3">memory band</div>
            </div>
          </div>
        </div>

        {/* live guardrail check */}
        <div
          className={cn(
            'mt-4 flex items-start gap-2.5 rounded-card border p-3',
            willEscalate ? 'border-danger/30 bg-danger/10' : 'border-teal/30 bg-teal-dim',
          )}
        >
          {willEscalate ? (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          ) : (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          )}
          <div className="text-small">
            {belowFloor ? (
              <span className="text-danger">
                Below your auto-bid floor {floor.label} — submitting routes this to {ownerName(tenantId)} for approval.
              </span>
            ) : role === 'Dispatcher' ? (
              <span className="text-warn">Inside floor, but Dispatcher bids route to {ownerName(tenantId)} for approval.</span>
            ) : (
              <span className="text-teal">Inside your auto-bid floor {floor.label} — executes immediately, logged, reversible.</span>
            )}
            <div className="mt-1 text-caption text-text-2">
              ◈ floor {floor.label} · margin at {sym}
              {amount.toLocaleString()}: <span className={margin >= 0 ? 'text-ok' : 'text-danger'}>{margin >= 0 ? '+' : '−'}{sym}{Math.abs(margin).toLocaleString()}</span>
              {' '}· win-rate 71% within +5% of avg ◈
            </div>
          </div>
        </div>

        {/* reasoning + memory citation */}
        <div className="mt-3 space-y-1.5">
          <div className="text-caption text-text-2">{suggestion.reasoning}</div>
          {suggestion.factId && <MemoryChip factId={suggestion.factId} />}
          {!suggestion.factId && (
            <MemoryChip label="no lane memory — regional estimate" confidence={suggestion.confidence} source="exchange" evidence={['priced from regional average']} />
          )}
        </div>

        {/* actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-chip border border-line-hairline px-4 py-2 text-small text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={amount <= 0}
            className={cn(
              'rounded-chip px-4 py-2 text-small font-medium transition-colors duration-150',
              willEscalate
                ? 'border border-warn/40 bg-warn/10 text-warn hover:border-warn'
                : 'bg-ember text-canvas hover:bg-ember-hi',
              amount <= 0 && 'cursor-not-allowed opacity-40',
            )}
          >
            {willEscalate ? 'Submit for approval' : `Place bid · ${fmtMoney({ amount, currency: load.price.currency })}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
