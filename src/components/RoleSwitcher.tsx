import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Eye } from 'lucide-react';
import { useStore } from '@/store';
import type { Role } from '@/store';
import { cn } from '@/lib/utils';

const ROLES: Role[] = ['Owner', 'Dispatcher', 'Finance', 'Driver', 'Customer'];

/** "View as: Owner ▾" — glass dropdown (§9.14). Role switch re-renders via the store. */
export default function RoleSwitcher() {
  const role = useStore((s) => s.role);
  const switchRole = useStore((s) => s.switchRole);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-chip border px-2.5 py-1.5 text-caption transition-colors',
          role === 'Owner' ? 'border-line-hairline text-text-2 hover:border-line-strong' : 'border-teal/40 bg-teal-dim text-teal',
        )}
      >
        <Eye className="h-3.5 w-3.5" />
        View as: {role}
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} />
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
              className="glass absolute right-0 top-full z-50 mt-1.5 w-44 rounded-card border border-line-strong p-1 shadow-modal"
            >
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => { switchRole(r); setOpen(false); }}
                  className="flex w-full items-center justify-between rounded-chip px-2.5 py-1.5 text-small text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
                >
                  {r}
                  {r === role && <Check className="h-3.5 w-3.5 text-teal" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
