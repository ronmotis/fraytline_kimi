// Composer-lite (movements.md §A1): pickup, drop, date, cargo → creates a movement.
// Pre-fills pricing from memory (suggestPrice) — the OS never asks twice.
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { Movement } from '@/store';
import MemoryChip from '@/components/MemoryChip';

const SPRING_PANEL = { type: 'spring', stiffness: 220, damping: 26 } as const;

const inputCls =
  'w-full rounded-card border border-line-hairline bg-surface-2 px-3 py-2 text-small text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-teal';

export default function NewMovementModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (m: Movement) => void;
}) {
  const customers = useStore((s) => s.customers.filter((c) => c.tenantId === s.activeTenantId));
  const suggestPrice = useStore((s) => s.suggestPrice);
  const addQuoteFromIntent = useStore((s) => s.addQuoteFromIntent);
  const convertQuoteToMovement = useStore((s) => s.convertQuoteToMovement);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [cargo, setCargo] = useState('');
  const [weightT, setWeightT] = useState('12');
  const [customer, setCustomer] = useState('');

  const suggestion = useMemo(
    () => (from.trim() && to.trim() ? suggestPrice({ from: from.trim(), to: to.trim() }, cargo) : null),
    [from, to, cargo, suggestPrice],
  );

  const canCreate = from.trim().length > 1 && to.trim().length > 1;

  const create = () => {
    if (!canCreate) return;
    const quote = addQuoteFromIntent(
      {
        from: from.trim(),
        to: to.trim(),
        weightT: Number(weightT) || 12,
        customer: customer.trim() || undefined,
        cargo: cargo.trim() || 'General cargo',
        pickupDate: date.trim() || undefined,
      },
      suggestion,
    );
    const movement = convertQuoteToMovement(quote.id);
    if (movement) onCreated(movement);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[75] bg-canvas/60"
            style={{ backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={SPRING_PANEL}
            className="glass fixed left-1/2 top-[18vh] z-[80] w-[520px] max-w-[92vw] -translate-x-1/2 rounded-modal border border-line-strong p-6 shadow-modal"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="font-display text-h2 text-text-1">New movement</div>
                <div className="mt-0.5 text-caption text-text-3">
                  One object — local drop or three-border corridor. Complexity reveals itself.
                </div>
              </div>
              <button onClick={onClose} className="rounded p-1 text-text-3 transition-colors hover:text-text-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-micro uppercase text-text-3">Pickup</span>
                <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Mombasa" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-micro uppercase text-text-3">Drop</span>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Kigali" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-micro uppercase text-text-3">Pickup date</span>
                <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Tue 21 May" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-micro uppercase text-text-3">Weight (t)</span>
                <input value={weightT} onChange={(e) => setWeightT(e.target.value)} inputMode="numeric" className={inputCls} />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-micro uppercase text-text-3">Cargo</span>
                <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Edible oils — 12t" className={inputCls} />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-micro uppercase text-text-3">Customer</span>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Bidco Africa"
                  list="movement-customers"
                  className={inputCls}
                />
                <datalist id="movement-customers">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </label>
            </div>

            {/* memory pre-fill */}
            {suggestion && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 flex items-center gap-2 rounded-card border border-teal/25 bg-teal-dim/40 p-3"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-teal" />
                <div className="min-w-0 flex-1">
                  <div className="text-small text-text-1">
                    Priced from memory: <span className="font-mono text-ember">{fmtMoney(suggestion.price)}</span>
                    <span className="text-text-3"> · band {fmtMoney({ amount: suggestion.band[0], currency: suggestion.price.currency })}–{fmtMoney({ amount: suggestion.band[1], currency: suggestion.price.currency })}</span>
                  </div>
                  <div className="mt-0.5 truncate text-caption text-text-3">{suggestion.reasoning}</div>
                </div>
                {suggestion.factId ? (
                  <MemoryChip factId={suggestion.factId} />
                ) : (
                  <MemoryChip label={`confidence ${suggestion.confidence}%`} confidence={suggestion.confidence} source="document" />
                )}
              </motion.div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-chip border border-line-strong px-4 py-2 text-small text-text-2 transition-colors hover:text-text-1"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={!canCreate}
                className="rounded-chip bg-ember px-4 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create movement
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
