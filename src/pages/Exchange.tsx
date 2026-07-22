// Exchange (exchange.md): load board w/ memory fit scores, capacity board w/
// auto-detected empties, governed bidding, deal room, ledger-computed reputation.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import type { ExchangeLoad } from '@/store';
import LoadCard from '@/components/exchange/LoadCard';
import BidModal from '@/components/exchange/BidModal';
import CapacityBoard from '@/components/exchange/CapacityBoard';
import DealRoom from '@/components/exchange/DealRoom';
import ReputationStrip from '@/components/exchange/ReputationStrip';
import { EXTRA_LOADS, computeDisplayFit, inRegion, useBidFloor } from '@/components/exchange/exchangeData';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function Tick({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.5, ease: EASE });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

const NETWORK_STATS: Record<string, { operators: number; loadsToday: number; corridors: number }> = {
  meridian: { operators: 214, loadsToday: 38, corridors: 12 },
  savannah: { operators: 64, loadsToday: 9, corridors: 4 },
};

type Mode = 'loads' | 'capacity';

export default function Exchange() {
  const tenant = useActiveTenant();
  const navigate = useNavigate();
  const role = useStore((s) => s.role);
  const autonomy = useStore((s) => s.autonomy.exchange ?? 'Approve');
  const storeLoads = useStore((s) => s.exchangeLoads);
  const placeBid = useStore((s) => s.placeBid);
  const suggestPrice = useStore((s) => s.suggestPrice);
  const pushToast = useStore((s) => s.pushToast);
  const floor = useBidFloor();

  const [mode, setMode] = useState<Mode>('loads');
  const [corridor, setCorridor] = useState<string>('all');
  const [date, setDate] = useState<string>('all');
  const [minFit, setMinFit] = useState(60);
  const [bidLoad, setBidLoad] = useState<ExchangeLoad | null>(null);
  const [dealLoad, setDealLoad] = useState<ExchangeLoad | null>(null);

  // regional slice of the network board (one product, different network slice)
  const loads = useMemo(() => {
    const regional = storeLoads.filter((l) => inRegion(tenant.id, l.from) && inRegion(tenant.id, l.to));
    return [...regional, ...(EXTRA_LOADS[tenant.id] ?? [])];
  }, [storeLoads, tenant.id]);

  const corridors = useMemo(() => ['all', ...Array.from(new Set(loads.map((l) => `${l.from}→${l.to}`)))], [loads]);
  const dates = useMemo(() => ['all', ...Array.from(new Set(loads.map((l) => l.date.split(' ')[0])))], [loads]);

  const fitScore = useStore((s) => s.fitScore);
  const facts = useStore((s) => s.memoryFacts);

  // sorted by memory fit — slider desaturates (never hides) below threshold
  const filtered = useMemo(
    () =>
      loads
        .filter(
          (l) =>
            (corridor === 'all' || `${l.from}→${l.to}` === corridor) &&
            (date === 'all' || l.date.startsWith(date)),
        )
        .map((l) => ({ load: l, fit: computeDisplayFit(l, fitScore(l), facts) }))
        .sort((a, b) => b.fit.score - a.fit.score),
    [loads, corridor, date, fitScore, facts],
  );

  const stats = NETWORK_STATS[tenant.id] ?? NETWORK_STATS.meridian;

  const onBid = (load: ExchangeLoad) => {
    if (autonomy === 'Autonomous' && role !== 'Dispatcher') {
      // autonomy dialed to Autonomous: bid fires immediately at the memory price
      const amount = suggestPrice({ from: load.from, to: load.to }, load.cargo).price.amount;
      const res = placeBid(load.id, amount);
      if (res.verdict === 'block' && res.reason === 'Load not found') {
        const sym = load.price.currency === 'GHS' ? 'GH₵' : '$';
        pushToast({
          title: 'Bid placed inside guardrails',
          body: `${load.from}→${load.to} · ${sym}${amount.toLocaleString()} · logged to Ledger`,
          tone: 'teal',
          ledgerLink: true,
        });
      }
      return;
    }
    setBidLoad(load);
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — header + mode toggle + network stats + governed chip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-h1 text-text-1">Exchange</h1>
          <p className="mt-1 text-body text-text-2">
            Capacity and loads across the operator network — matched against <span className="text-teal">your</span> model.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 font-mono text-data text-text-2">
            <span><Tick value={stats.operators} format={(v) => `${Math.round(v)}`} /> operators</span>
            <span className="text-text-3">·</span>
            <span><Tick value={stats.loadsToday} format={(v) => `${Math.round(v)}`} /> loads today</span>
            <span className="text-text-3">·</span>
            <span>corridors: <Tick value={stats.corridors} format={(v) => `${Math.round(v)}`} /></span>
          </div>
          <button
            onClick={() => navigate('/actions')}
            className="inline-flex items-center gap-1.5 rounded-chip border border-teal/30 bg-teal-dim px-2.5 py-1.5 text-caption text-teal transition-colors hover:border-teal"
            title="Governed bidding — open Autonomy"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Bidding: {autonomy} mode · floor {floor.label} ◈
          </button>
        </div>
      </motion.div>

      {/* segmented mode toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.24 }}
        className="flex items-center gap-1 border-b border-line-hairline"
      >
        {([
          ['loads', 'Find Loads'],
          ['capacity', 'Offer Capacity'],
        ] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'relative px-4 py-2.5 text-small font-medium transition-colors duration-150',
              mode === m ? 'text-text-1' : 'text-text-3 hover:text-text-2',
            )}
          >
            {label}
            {mode === m && (
              <motion.span
                layoutId="exchange-mode"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ember"
              />
            )}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'loads' ? (
          <motion.div
            key="loads"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="space-y-4"
          >
            {/* filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              {corridors.map((c) => (
                <button
                  key={c}
                  onClick={() => setCorridor(c)}
                  className={cn(
                    'rounded-chip border px-2.5 py-1 font-mono text-caption transition-colors duration-150',
                    corridor === c ? 'border-ember/40 bg-ember-dim text-ember' : 'border-line-hairline text-text-2 hover:border-line-strong',
                  )}
                >
                  {c === 'all' ? 'All corridors' : c}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-line-hairline" />
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={cn(
                    'rounded-chip border px-2.5 py-1 text-caption transition-colors duration-150',
                    date === d ? 'border-ember/40 bg-ember-dim text-ember' : 'border-line-hairline text-text-2 hover:border-line-strong',
                  )}
                >
                  {d === 'all' ? 'Any date' : d}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-line-hairline" />
              <label className="flex items-center gap-2 text-caption text-text-3">
                min fit
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minFit}
                  onChange={(e) => setMinFit(Number(e.target.value))}
                  className="h-1 w-28 cursor-pointer accent-teal"
                />
                <span className="w-7 font-mono text-data text-teal">{minFit}</span>
              </label>
            </div>

            {/* load cards grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ load, fit }, i) => (
                <LoadCard key={load.id} load={load} index={i} dimmed={fit.score < minFit} onBid={onBid} onDetails={setDealLoad} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="rounded-panel border border-line-hairline bg-surface-1 p-8 text-center text-body text-text-3">
                No loads match these filters — widen the corridor or drop the fit threshold.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="capacity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <CapacityBoard />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 5 — reputation strip */}
      <ReputationStrip />

      {/* overlays */}
      <AnimatePresence>
        {bidLoad && <BidModal key="bid" load={bidLoad} onClose={() => setBidLoad(null)} />}
        {dealLoad && <DealRoom key="deal" load={dealLoad} onClose={() => setDealLoad(null)} />}
      </AnimatePresence>
    </div>
  );
}
