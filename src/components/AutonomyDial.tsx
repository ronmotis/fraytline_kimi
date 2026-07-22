import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import type { AutonomyLevel } from '@/store';
import { cn } from '@/lib/utils';

const STOPS: AutonomyLevel[] = ['Manual', 'Suggest', 'Approve', 'Autonomous'];

const IMPACT: Record<AutonomyLevel, string> = {
  Manual: 'Fraytline will stop proposing in this workflow. You do everything by hand.',
  Suggest: 'Fraytline drafts and proposes — nothing executes without you.',
  Approve: 'Fraytline prepares actions and executes after your one-click approval.',
  Autonomous: 'Fraytline will act without asking. Guardrails still apply and everything stays reversible in the Ledger.',
};

/** 4-stop segmented autonomy control (§9.4). Raising autonomy asks for confirmation. */
export default function AutonomyDial({
  value,
  onChange,
  className,
}: {
  value: AutonomyLevel;
  onChange: (level: AutonomyLevel) => void;
  className?: string;
}) {
  const [pending, setPending] = useState<AutonomyLevel | null>(null);
  const raising = (l: AutonomyLevel) => STOPS.indexOf(l) > STOPS.indexOf(value);

  return (
    <div className={cn('relative', className)}>
      <div className="inline-flex rounded-full border border-line-hairline bg-surface-2 p-0.5">
        {STOPS.map((stop) => {
          const active = stop === value;
          return (
            <button
              key={stop}
              onClick={() => (raising(stop) ? setPending(stop) : onChange(stop))}
              className={cn(
                'relative flex items-center gap-1 rounded-full px-3 py-1 text-micro uppercase transition-colors',
                active ? 'text-canvas' : 'text-text-3 hover:text-text-2',
              )}
            >
              {active && (
                <motion.span
                  layoutId="autonomy-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className={cn('absolute inset-0 rounded-full', stop === 'Autonomous' ? 'bg-teal' : 'bg-text-2')}
                />
              )}
              <span className="relative flex items-center gap-1">
                {stop === 'Autonomous' && <ShieldCheck className="h-3 w-3" />}
                {stop}
              </span>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass absolute left-0 top-full z-50 mt-2 w-80 rounded-card border border-line-strong p-4 shadow-modal"
          >
            <div className="text-body-strong text-text-1">Raise autonomy to {pending}?</div>
            <p className="mt-1 text-caption text-text-2">{IMPACT[pending]}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { onChange(pending); setPending(null); }}
                className="rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
              >
                Confirm
              </button>
              <button
                onClick={() => setPending(null)}
                className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 hover:text-text-1"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
