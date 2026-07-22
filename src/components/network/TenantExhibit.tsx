// Tenant exhibit (network.md §0): the "one model, any size" proof — two tenants
// side by side, connected by a "same model" hairline, switching swaps the app.
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const DEPTH: Record<string, string> = {
  meridian: 'Multinational forwarder · 4 branches · 3 countries · 14 trucks · reveals L0–L4',
  savannah: 'Local operator · 1 branch · 4 trucks · reveals L0–L1 (+L2/L3 only on its one cross-border job)',
};

export default function TenantExhibit() {
  const tenants = useStore((s) => s.tenants);
  const active = useActiveTenant();
  const switchTenant = useStore((s) => s.switchTenant);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.3, ease: EASE }}
      className="rounded-panel border border-line-hairline bg-surface-1 p-6"
    >
      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
        {tenants.map((t, i) => {
          const isActive = t.id === active.id;
          return (
            <div key={t.id} className="flex flex-1 flex-col items-stretch gap-4 md:flex-row md:items-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 + i * 0.08, duration: 0.3, ease: EASE }}
                className={cn(
                  'flex-1 rounded-card border p-5 transition-colors',
                  isActive ? 'border-teal/40 bg-teal-dim' : 'border-line-hairline bg-surface-2',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={t.logo} alt="" className="h-10 w-10 rounded-card bg-surface-3 p-1" />
                    <div>
                      <div className="font-display text-h3 font-semibold text-text-1">{t.name}</div>
                      <div className="text-caption text-text-3">{t.hq}</div>
                    </div>
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-chip border border-teal/40 px-2 py-0.5 text-micro uppercase text-teal">
                      <Check className="h-3 w-3" /> current
                    </span>
                  )}
                </div>
                <p className="mt-3 text-small text-text-2">{DEPTH[t.id] ?? t.descriptor}</p>
                {!isActive && (
                  <button
                    onClick={() => switchTenant(t.id)}
                    className="mt-3 rounded-chip border border-line-strong px-3 py-1.5 text-caption font-medium text-text-1 transition-colors hover:border-teal hover:text-teal"
                  >
                    Switch to view
                  </button>
                )}
              </motion.div>

              {/* "same model" hairline connector between the two cards */}
              {i < tenants.length - 1 && (
                <div className="relative flex items-center justify-center md:w-28">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
                    className="hidden h-px w-full origin-center bg-teal/50 md:block"
                  />
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
                    className="h-8 w-px origin-center bg-teal/50 md:hidden"
                  />
                  <span className="absolute whitespace-nowrap rounded-chip border border-teal/30 bg-canvas px-2 py-0.5 text-micro uppercase text-teal">
                    same model
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-4 text-caption text-text-2"
      >
        Not two editions. One operating system — the interface reveals only the complexity each business actually has.
      </motion.p>
    </motion.section>
  );
}
