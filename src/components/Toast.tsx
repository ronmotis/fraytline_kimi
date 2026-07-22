import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store';
import type { Toast as ToastT } from '@/store';
import { cn } from '@/lib/utils';

const BAR: Record<ToastT['tone'], string> = {
  ok: 'bg-ok',
  ember: 'bg-ember',
  teal: 'bg-teal',
  danger: 'bg-danger',
};

function ToastCard({ toast }: { toast: ToastT }) {
  const dismissToast = useStore((s) => s.dismissToast);
  const undoLedgerEntry = useStore((s) => s.undoLedgerEntry);

  useEffect(() => {
    const t = setTimeout(() => dismissToast(toast.id), 6000);
    return () => clearTimeout(t);
  }, [toast.id, dismissToast]);

  return (
    <motion.div
      layout
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="glass pointer-events-auto relative w-[340px] overflow-hidden rounded-card border border-line-strong shadow-modal"
    >
      <div className={cn('absolute inset-y-0 left-0 w-0.5', BAR[toast.tone])} />
      <div className="px-4 py-3 pl-5">
        <div className="text-body-strong text-text-1">{toast.title}</div>
        {toast.body && <div className="mt-0.5 text-caption text-text-2">{toast.body}</div>}
        {toast.undoEntryId && (
          <button
            onClick={() => { undoLedgerEntry(toast.undoEntryId!); dismissToast(toast.id); }}
            className="mt-1.5 text-micro uppercase text-ember transition-colors hover:text-ember-hi"
          >
            Undo
          </button>
        )}
      </div>
      {/* 5s countdown hairline */}
      <motion.div
        className={cn('h-px', BAR[toast.tone])}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 6, ease: 'linear' }}
      />
    </motion.div>
  );
}

/** Bottom-right toast stack (max 3, glass) — render once inside the app shell. */
export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[90] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.slice(-3).map((t) => <ToastCard key={t.id} toast={t} />)}
      </AnimatePresence>
    </div>
  );
}
