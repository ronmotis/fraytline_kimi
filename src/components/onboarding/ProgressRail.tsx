import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { EASE_OUT_EXPO } from './types';
import { cn } from '@/lib/utils';

const NODES = ['Identity', 'Memory', 'Interview', 'Model', 'Autonomy'];

/**
 * Genesis progress rail (onboarding.md — global page behavior):
 * 5 nodes, active = ember dot with glow-ember, completed = teal check,
 * connector lines fill 400ms per step.
 */
export default function ProgressRail({ step }: { step: number }) {
  // step 1..5 → node index 0..4
  const active = step - 1;
  return (
    <motion.div
      className="fixed left-1/2 top-6 z-30 flex -translate-x-1/2 items-center"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {NODES.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <svg width="44" height="2" className="mx-2 overflow-visible">
                <line x1="0" y1="1" x2="44" y2="1" stroke="var(--line-hairline)" strokeWidth="1" />
                <motion.line
                  x1="0"
                  y1="1"
                  x2="44"
                  y2="1"
                  stroke={done || current ? 'var(--teal)' : 'var(--line-hairline)'}
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: i <= active ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                />
              </svg>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full',
                  current && 'bg-ember shadow-glow-ember',
                  done && 'bg-teal-dim',
                  !done && !current && 'border border-line-strong',
                )}
              >
                {done && <Check className="h-2.5 w-2.5 text-teal" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'text-micro uppercase',
                  current ? 'text-text-1' : done ? 'text-teal' : 'text-text-3',
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
