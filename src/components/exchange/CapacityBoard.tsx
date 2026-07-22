// My Capacity (exchange.md §3): Conductor-detected empty legs (Living Border,
// one approval to post) + posted listings with incoming bids & governed accepts.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Radar, Star, TriangleAlert, X } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import type { ExchangeCapacity } from '@/store';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';
import { initials } from './exchangeData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

// ---------- auto-detected empty legs (per tenant, cited from movements) ----------

interface Detection {
  id: string;
  vehiclePlate: string;
  from: string;
  to: string;
  date: string;
  text: string;
  recovery: string;
  kind: 'leg' | 'idle';
  factId?: string;
}

const DETECTIONS: Record<string, Detection[]> = {
  meridian: [
    {
      id: 'det-kdj', vehiclePlate: 'KDJ 482T', from: 'Kampala', to: 'Nairobi', date: 'Thu 16 May',
      text: 'KDJ 482T returns Kampala → Nairobi, Thursday — empty ◈ (from MR-2481 schedule). Post to Exchange?',
      recovery: '$640', kind: 'leg', factId: 'f-lane-kla-nbo',
    },
    {
      id: 'det-kdl', vehiclePlate: 'KDL 117C', from: 'Nairobi', to: 'Open destination', date: 'Fri 17 – Sat 18 May',
      text: 'KDL 117C idle Fri–Sat, Nairobi yard.',
      recovery: '$380', kind: 'idle',
    },
  ],
  savannah: [
    {
      id: 'det-gh', vehiclePlate: 'GH 4521-24', from: 'Kumasi', to: 'Accra', date: 'Fri 17 May',
      text: 'GH 4521-24 returns Kumasi → Accra, Friday — empty ◈ (from SV-104 schedule). Post to Exchange?',
      recovery: 'GH₵1,900', kind: 'leg', factId: 'f-lane-acc-kum',
    },
    {
      id: 'det-gw', vehiclePlate: 'GW 8832-23', from: 'Tema', to: 'Open destination', date: 'Sat 18 – Sun 19 May',
      text: 'GW 8832-23 idle this weekend, Tema yard.',
      recovery: 'GH₵950', kind: 'idle',
    },
  ],
};

// ---------- incoming bids on posted listings ----------

interface IncomingBid {
  id: string;
  bidder: string;
  amount: number;
  sym: string;
  rating: number;
  warn?: string;
  recommended?: boolean;
  recReason?: string;
}

const LISTING_BIDS: Record<string, IncomingBid[]> = {
  'Kampala→Nairobi': [
    { id: 'ib-1', bidder: 'TransAfrica Cargo', amount: 580, sym: '$', rating: 4.8, recommended: true, recReason: 'higher trust ◈ payment speed 96%' },
    { id: 'ib-2', bidder: 'Lakeshore Logistics', amount: 610, sym: '$', rating: 4.2, warn: 'docs incomplete last job ◈' },
  ],
  'Kumasi→Accra': [
    { id: 'ib-3', bidder: 'Kumasi Express', amount: 1750, sym: 'GH₵', rating: 4.5, recommended: true, recReason: 'on-time 94% ◈ pays in 7 days' },
    { id: 'ib-4', bidder: 'Ashanti Freight', amount: 1820, sym: 'GH₵', rating: 4.1, warn: 'late POD last job ◈' },
  ],
};

function bidsFor(cap: ExchangeCapacity): IncomingBid[] {
  return LISTING_BIDS[`${cap.from}→${cap.to}`] ?? [];
}

// ---------- component ----------

export default function CapacityBoard() {
  const tenant = useActiveTenant();
  const postCapacity = useStore((s) => s.postCapacity);
  const pushToast = useStore((s) => s.pushToast);
  const listings = useStore((s) => s.exchangeCapacity.filter((c) => c.tenantId === s.activeTenantId));
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [posted, setPosted] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<Record<string, string>>({}); // capId -> bidId

  const detections = (DETECTIONS[tenant.id] ?? []).filter((d) => !dismissed.includes(d.id));

  const post = (d: Detection) => {
    postCapacity({ from: d.from, to: d.to, date: d.date, vehiclePlate: d.vehiclePlate });
    setPosted((p) => [...p, d.id]);
  };

  const dismiss = (d: Detection) => {
    setDismissed((p) => [...p, d.id]);
    pushToast({ title: 'Noted ◈', body: `won't suggest the ${d.from}→${d.to} window again`, tone: 'teal' });
  };

  const accept = (cap: ExchangeCapacity, bid: IncomingBid) => {
    setAccepted((a) => ({ ...a, [cap.id]: bid.id }));
    pushToast({
      title: `Accepted ${bid.sym}${bid.amount.toLocaleString()} · ${bid.bidder}`,
      body: `${cap.from}→${cap.to} · escrow opened · guardrail: documented carrier ✓ · logged to Ledger`,
      tone: 'ok',
      ledgerLink: true,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* left — auto-detected empty legs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-micro uppercase text-text-3">
          <Radar className="h-3.5 w-3.5 text-teal" />
          Auto-detected empty legs
        </div>
        <AnimatePresence>
          {detections.map((d, i) => {
            const isPosted = posted.includes(d.id) || listings.some((l) => l.vehiclePlate === d.vehiclePlate && l.from === d.from && l.to === d.to);
            return (
              <motion.div
                key={d.id}
                layout="position"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ delay: i * 0.08, duration: 0.3, ease: EASE }}
                className="living-border rounded-card border border-line-hairline bg-surface-1 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-body-strong text-text-1">
                    <span className="font-mono">{d.vehiclePlate}</span>
                    <span className="text-text-3"> · </span>
                    {d.from} → {d.to}
                  </div>
                  <button onClick={() => dismiss(d)} className="text-text-3 transition-colors hover:text-text-1" title="Dismiss">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-small text-text-2">{d.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-caption text-text-2">
                    Est. recovery <span className="font-mono text-data text-ok">{d.recovery}</span>
                  </span>
                  {d.factId && <MemoryChip factId={d.factId} />}
                </div>
                <div className="mt-4 flex gap-2">
                  {isPosted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-chip border border-teal/30 bg-teal-dim px-3 py-2 text-small font-medium text-teal">
                      <CircleCheck className="h-3.5 w-3.5" /> Posted to Exchange
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING}
                      onClick={() => post(d)}
                      className="rounded-chip bg-ember px-3 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
                    >
                      {d.kind === 'leg' ? 'Post capacity' : 'Post availability'}
                    </motion.button>
                  )}
                  {!isPosted && (
                    <button
                      onClick={() => dismiss(d)}
                      className="rounded-chip border border-line-hairline px-3 py-2 text-small text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {detections.length === 0 && (
          <div className="rounded-card border border-line-hairline bg-surface-1 p-5 text-small text-text-3">
            No undetected empty legs — every returning unit is either posted or assigned ◈
          </div>
        )}
      </div>

      {/* right — posted listings */}
      <div className="space-y-4">
        <div className="text-micro uppercase text-text-3">Posted listings</div>
        <AnimatePresence>
          {listings.map((cap, i) => {
            const bids = bidsFor(cap);
            const acceptedBid = bids.find((b) => b.id === accepted[cap.id]);
            return (
              <motion.div
                key={cap.id}
                layout="position"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}
                className="rounded-card border border-line-hairline bg-surface-1 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display text-h3 font-semibold text-text-1">
                    {cap.from} <span className="text-text-3">→</span> {cap.to}
                  </div>
                  <span
                    className={cn(
                      'rounded-chip border px-2 py-0.5 text-micro uppercase',
                      acceptedBid
                        ? 'border-ok/30 bg-ok/10 text-ok'
                        : bids.length > 0
                          ? 'border-teal/30 bg-teal-dim text-teal'
                          : 'border-line-hairline text-text-3',
                    )}
                  >
                    {acceptedBid ? 'awarded' : bids.length > 0 ? `${bids.length} bids` : 'listed'}
                  </span>
                </div>
                <div className="mt-1 text-caption text-text-2">
                  <span className="font-mono">{cap.vehiclePlate}</span> · {cap.date} · FTL
                </div>

                {/* incoming bids */}
                <div className="mt-3 space-y-2">
                  {bids.map((bid) => {
                    const isAccepted = accepted[cap.id] === bid.id;
                    const otherAccepted = accepted[cap.id] && !isAccepted;
                    return (
                      <div
                        key={bid.id}
                        className={cn(
                          'rounded-card border p-3 transition-colors',
                          isAccepted ? 'border-ok/40 bg-ok/10' : 'border-line-hairline bg-surface-2',
                          otherAccepted && 'opacity-40',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-chip bg-surface-3 font-mono text-[10px] font-semibold text-text-2">
                            {initials(bid.bidder)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-small text-text-1">{bid.bidder}</div>
                            <div className="flex items-center gap-1.5 text-caption text-text-3">
                              <Star className="h-3 w-3 fill-current text-ok" />
                              <span className="font-mono">{bid.rating.toFixed(1)}</span>
                              {bid.warn && (
                                <span className="inline-flex items-center gap-1 text-warn">
                                  <TriangleAlert className="h-3 w-3" /> {bid.warn}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-data-lg text-text-1">
                            {bid.sym}{bid.amount.toLocaleString()}
                          </span>
                          {!accepted[cap.id] && (
                            <button
                              onClick={() => accept(cap, bid)}
                              className="rounded-chip border border-ember/40 bg-ember-dim px-2.5 py-1.5 text-caption font-medium text-ember transition-colors hover:border-ember"
                            >
                              Accept
                            </button>
                          )}
                          {isAccepted && <CircleCheck className="h-5 w-5 text-ok" />}
                        </div>
                        {bid.recommended && !accepted[cap.id] && (
                          <div className="mt-2 flex items-center gap-1.5 text-caption text-teal">
                            <span className="text-[10px]">◈</span>
                            Conductor recommends {bid.sym}{bid.amount.toLocaleString()} — {bid.recReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {bids.length === 0 && (
                    <div className="rounded-card border border-line-hairline bg-surface-2 p-3">
                      <div className="text-caption text-text-2">Listening for bids — partners in this corridor notified.</div>
                      <div className="thinking-line mt-2 h-px w-full" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {listings.length === 0 && (
          <div className="rounded-card border border-line-hairline bg-surface-1 p-5 text-small text-text-3">
            Nothing posted yet — accept a detection on the left and it materializes here.
          </div>
        )}
      </div>
    </div>
  );
}
