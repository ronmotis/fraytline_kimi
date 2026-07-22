import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import { cn } from '@/lib/utils';

/**
 * Prototype control (§8.2): swaps the entire dataset + reveal depth —
 * one model serves the multinational and the 4-truck operator.
 */
export default function TenantSwitcher() {
  const tenant = useActiveTenant();
  const tenants = useStore((s) => s.tenants);
  const switchTenant = useStore((s) => s.switchTenant);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line-hairline bg-surface-2 py-1 pl-1.5 pr-2.5 transition-colors hover:border-line-strong"
      >
        <img src={tenant.logo} alt="" className="h-5 w-5 rounded-full bg-surface-3" />
        <span className="text-caption text-text-1">{tenant.name}</span>
        <ChevronDown className={cn('h-3 w-3 text-text-3 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="glass absolute left-0 top-full z-50 mt-1.5 w-64 rounded-card border border-line-strong p-1 shadow-modal"
            >
              <div className="px-2.5 pb-1 pt-2 text-micro uppercase text-text-3">Same model · any size</div>
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { switchTenant(t.id); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <img src={t.logo} alt="" className="h-7 w-7 rounded-full bg-surface-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small text-text-1">{t.name}</span>
                    <span className="block truncate text-caption text-text-3">{t.descriptor}</span>
                  </span>
                  {t.id === tenant.id && <Check className="h-4 w-4 shrink-0 text-teal" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
