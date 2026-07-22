// Add-exception modal (movements.md §B3 tab 4) — type chips + note; raising it
// notifies Conductor ("Noted. Recalculating ETA and drafting customer update — approve?").
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '@/store';
import type { Movement } from '@/store';
import type { LocalException } from './RailTabs';
import { cn } from '@/lib/utils';

const SPRING_PANEL = { type: 'spring', stiffness: 220, damping: 26 } as const;
const EXCEPTION_TYPES = ['delay', 'document', 'damage', 'other'];

export default function AddExceptionModal({
  movement,
  open,
  onClose,
  onRaised,
}: {
  movement: Movement;
  open: boolean;
  onClose: () => void;
  onRaised: (ex: LocalException) => void;
}) {
  const pushToast = useStore((s) => s.pushToast);
  const [type, setType] = useState('delay');
  const [note, setNote] = useState('');

  const raise = () => {
    if (!note.trim()) return;
    onRaised({ id: `ex-${Date.now()}`, type, note: note.trim() });
    setNote('');
    onClose();
    pushToast({
      title: 'Conductor: noted.',
      body: 'Recalculating ETA and drafting customer update — approve?',
      tone: 'teal',
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[75] bg-canvas/60"
            style={{ backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={SPRING_PANEL}
            className="glass fixed left-1/2 top-[24vh] z-[80] w-[420px] max-w-[92vw] -translate-x-1/2 rounded-modal border border-line-strong p-5 shadow-modal"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-h3 text-text-1">Add exception — {movement.id}</span>
              <button onClick={onClose} className="rounded p-1 text-text-3 hover:text-text-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex gap-1.5">
              {EXCEPTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-chip border px-2.5 py-1 text-caption capitalize transition-colors',
                    type === t ? 'border-danger/50 bg-danger/10 text-danger' : 'border-line-hairline text-text-3 hover:text-text-2',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened? e.g. driver reports axle issue at weighbridge"
              rows={3}
              className="w-full rounded-card border border-line-hairline bg-surface-2 px-3 py-2 text-small text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 hover:text-text-1"
              >
                Cancel
              </button>
              <button
                onClick={raise}
                disabled={!note.trim()}
                className="rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi disabled:opacity-40"
              >
                Raise exception
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
