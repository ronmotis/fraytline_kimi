// Deal Room (exchange.md §4): 560px drawer — negotiation thread, Conductor
// suggestion strip, terms from memory, governed award → convert to movement.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Paperclip, ShieldCheck, X } from 'lucide-react';
import { useStore } from '@/store';
import type { Doc, ExchangeLoad } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import MemoryChip from '@/components/MemoryChip';
import DocChip from '@/components/DocChip';
import { cn } from '@/lib/utils';
import { initials, posterMeta } from './exchangeData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface Msg {
  id: string;
  side: 'them' | 'us' | 'conductor';
  text: string;
  time: string;
}

const DEAL_DOCS: Record<string, Doc[]> = {
  default: [
    { id: 'dd-1', name: 'COMESA Yellow Card', status: 'verified' },
    { id: 'dd-2', name: 'Carrier insurance', status: 'verified' },
    { id: 'dd-3', name: 'Rate confirmation', status: 'pending' },
  ],
  savannah: [
    { id: 'dd-s1', name: 'Goods-in-transit insurance', status: 'verified' },
    { id: 'dd-s2', name: 'Road worthy certificate', status: 'verified' },
    { id: 'dd-s3', name: 'Rate confirmation', status: 'pending' },
  ],
};

export default function DealRoom({ load, onClose }: { load: ExchangeLoad; onClose: () => void }) {
  const suggestPrice = useStore((s) => s.suggestPrice);
  const addQuoteFromIntent = useStore((s) => s.addQuoteFromIntent);
  const convertQuoteToMovement = useStore((s) => s.convertQuoteToMovement);
  const pushToast = useStore((s) => s.pushToast);
  const tenantId = useStore((s) => s.activeTenantId);
  const navigate = useNavigate();

  const meta = posterMeta(load.poster);
  const suggestion = useMemo(() => suggestPrice({ from: load.from, to: load.to }, load.cargo), [suggestPrice, load]);
  const sym = load.price.currency === 'GHS' ? 'GH₵' : '$';
  const fmt = (n: number) => `${sym}${n.toLocaleString()}`;

  // negotiation figures derived from the memory band
  const offer = suggestion.band[0];
  const counter = suggestion.price.amount;
  const theirs = Math.round(suggestion.price.amount * 0.97);
  const counter2 = Math.round(suggestion.price.amount * 0.985);

  const [thread, setThread] = useState<Msg[]>([
    { id: 'm1', side: 'them', text: `Offer ${fmt(offer)} — ${load.cargo.toLowerCase()}, ${load.date}. Can you cover?`, time: '09:41' },
    { id: 'm2', side: 'conductor', text: `Countered ${fmt(counter)} on your behalf — approved by you · inside win band ◈`, time: '09:52' },
    { id: 'm3', side: 'them', text: `${fmt(theirs)} and we have a deal. Docs at pickup.`, time: '10:07' },
  ]);
  const [awarded, setAwarded] = useState(false);
  const [converted, setConverted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const accept = () => {
    setAwarded(true);
    setThread((t) => [...t, { id: `m${t.length + 1}`, side: 'us', text: `Accepted ${fmt(theirs)} — within band ◈, secures the ${load.date.split(' ')[0]} window.`, time: 'now' }]);
    pushToast({
      title: `Deal awarded · ${fmt(theirs)}`,
      body: `${load.from}→${load.to} · ${load.poster} · escrow opened · logged to Ledger`,
      tone: 'ok',
      ledgerLink: true,
    });
  };

  const sendCounter = () => {
    setThread((t) => [...t, { id: `m${t.length + 1}`, side: 'us', text: `Counter ${fmt(counter2)} — splits the difference, keeps margin above floor ◈`, time: 'now' }]);
    timers.current.push(
      setTimeout(() => {
        setThread((t) => [...t, { id: `m${t.length + 1}`, side: 'them', text: `${fmt(theirs)} is final — truck is ready Thursday.`, time: 'now' }]);
      }, 1200),
    );
  };

  const attach = () =>
    pushToast({ title: 'Document attached from memory', body: 'COMESA + insurance auto-attached ◈ · logged to Ledger', tone: 'teal', ledgerLink: true });

  const convert = () => {
    const quote = addQuoteFromIntent(
      { from: load.from, to: load.to, weightT: load.weightT, customer: load.poster, cargo: load.cargo, pickupDate: load.date },
      null,
    );
    convertQuoteToMovement(quote.id);
    setConverted(true);
    timers.current.push(setTimeout(() => { onClose(); navigate('/movements'); }, 900));
  };

  const docs = DEAL_DOCS[tenantId] ?? DEAL_DOCS.default;

  return (
    <div className="fixed inset-0 z-[80]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-[rgba(14,13,11,0.6)] backdrop-blur-[8px]" />
      <motion.div
        initial={{ x: 560 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="absolute bottom-0 right-0 top-0 flex w-[560px] max-w-full flex-col border-l border-line-strong bg-surface-1"
      >
        {/* header — route + counterparty reputation block */}
        <div className="relative border-b border-line-hairline p-5">
          {awarded && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="absolute inset-x-0 top-0 h-0.5 origin-left bg-ok"
            />
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-micro uppercase text-text-3">Deal room {awarded && <span className="text-ok">· awarded</span>}</div>
              <div className="mt-1 font-display text-h2 text-text-1">
                {load.from} <span className="text-text-3">→</span> {load.to}
              </div>
              <div className="mt-0.5 text-caption text-text-2">{load.cargo} · {load.date}</div>
            </div>
            <button onClick={onClose} className="text-text-3 transition-colors hover:text-text-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-card border border-line-hairline bg-surface-2 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-chip bg-surface-3 font-mono text-[11px] font-semibold text-text-2">
              {initials(load.poster)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-small font-medium text-text-1">{load.poster}</div>
              <div className="text-caption text-text-3">{meta.relation} · {meta.jobs} jobs</div>
            </div>
            <div className="flex flex-col items-center">
              <ConfidenceRing value={meta.rating * 20} size={34} showLabel />
              <span className="mt-0.5 font-mono text-[9px] text-text-3">{meta.rating.toFixed(1)}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MemoryChip label={`docs ${meta.docsPct ?? 94}%`} confidence={meta.docsPct ?? 94} source="exchange" evidence={[`${meta.jobs} jobs · shared history`]} />
            {meta.paysDays && <MemoryChip label={`pays in ${meta.paysDays} days avg`} confidence={88} source="exchange" evidence={['settlement ledger ◈']} />}
          </div>
        </div>

        {/* thread */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {thread.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.24, ease: EASE }}
              className={cn('flex', m.side === 'them' ? 'justify-start' : 'justify-end')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-card border p-3',
                  m.side === 'them' && 'border-line-hairline bg-surface-2',
                  m.side === 'us' && 'border-ember/30 bg-ember-dim',
                  m.side === 'conductor' && 'border-teal/30 bg-teal-dim',
                )}
              >
                {m.side === 'conductor' && (
                  <div className="mb-1 flex items-center gap-1.5 text-micro uppercase text-teal">
                    <ShieldCheck className="h-3 w-3" /> Conductor · governed
                  </div>
                )}
                <div className="text-small text-text-1">{m.text}</div>
                <div className="mt-1 text-right font-mono text-[10px] text-text-3">{m.time}</div>
              </div>
            </motion.div>
          ))}

          {/* Conductor suggestion strip */}
          {!awarded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3, ease: EASE }}
              className="rounded-card border border-teal/30 bg-teal-dim p-3"
            >
              <div className="text-small text-teal">
                Accept {fmt(theirs)} — within band ◈, secures the {load.date.split(' ')[0]} {load.from === 'Kampala' ? 'backhaul' : 'window'}
              </div>
              <div className="mt-2.5 flex gap-2">
                <button onClick={accept} className="rounded-chip bg-ember px-3 py-1.5 text-caption font-medium text-canvas transition-colors hover:bg-ember-hi">
                  Accept {fmt(theirs)}
                </button>
                <button onClick={sendCounter} className="rounded-chip border border-teal/40 px-3 py-1.5 text-caption font-medium text-teal transition-colors hover:border-teal">
                  Counter {fmt(counter2)}
                </button>
                <button onClick={attach} className="inline-flex items-center gap-1 rounded-chip border border-line-hairline px-3 py-1.5 text-caption text-text-2 transition-colors hover:border-line-strong hover:text-text-1">
                  <Paperclip className="h-3 w-3" /> Attach docs
                </button>
              </div>
            </motion.div>
          )}

          {/* terms + convert (post-award) */}
          <AnimatePresence>
            {awarded && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-3"
              >
                <div className="rounded-card border border-line-hairline bg-surface-2 p-4">
                  <div className="text-micro uppercase text-text-3">Terms</div>
                  <div className="mt-2 space-y-1.5 text-small text-text-2">
                    <div>Payment held in Exchange escrow — released on POD ◈</div>
                    <div>Rate <span className="font-mono text-data text-text-1">{fmt(theirs)}</span> · margin <span className="font-mono text-data text-ok">+{fmt(theirs - Math.round(suggestion.price.amount * 0.82))}</span></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {docs.map((d) => <DocChip key={d.id} doc={d} />)}
                  </div>
                  <div className="mt-2 text-caption text-text-3">docs checklist auto-attached from your memory ◈</div>
                </div>
                <motion.button
                  onClick={convert}
                  disabled={converted}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-card px-4 py-3.5 text-body-strong transition-colors',
                    converted ? 'border border-ok/40 bg-ok/10 text-ok' : 'bg-ember text-canvas hover:bg-ember-hi shadow-glow-ember',
                  )}
                >
                  {converted ? 'Materialized as a movement' : 'Convert to movement'}
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
