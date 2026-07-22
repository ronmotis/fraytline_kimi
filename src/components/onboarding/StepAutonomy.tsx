import { useEffect, useRef } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import AutonomyDial from '@/components/AutonomyDial';
import { useStore } from '@/store';
import { EASE_OUT_EXPO } from './types';
import { cssVar, trgb, useTheme } from '@/lib/theme';

const ROWS = [
  { key: 'quoting', label: 'Quote pricing & sending', note: 'I draft from memory; you send.' },
  { key: 'customer-updates', label: 'Customer updates', note: 'I propose messages; nothing sends silently.' },
  { key: 'exchange', label: 'Exchange bidding', note: 'I bid only inside your floors.' },
  { key: 'documents', label: 'Document renewals', note: 'Regulated documents always ask.' },
];

/**
 * Step 5 — Autonomy ("You set the boundaries. I work inside them.").
 * 4 AutonomyDial rows (default Suggest), guardrail summary, Enter Fraytline.
 * Dials mutate the real store — the Autonomy page reflects these immediately.
 */
export default function StepAutonomy({ onEnter }: { onEnter: () => void }) {
  useTheme(); // refresh CTA colors on theme flip
  const autonomy = useStore((s) => s.autonomy);
  const setAutonomy = useStore((s) => s.setAutonomy);
  const initialized = useRef(false);

  // Genesis default: every workflow starts at Suggest (onboarding.md §Step 5)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const state = useStore.getState();
    ROWS.forEach(({ key }) => {
      if (state.autonomy[key] !== 'Suggest') state.setAutonomy(key, 'Suggest');
    });
  }, []);

  return (
    <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 pb-16 pt-28">
      <div className="w-full max-w-[760px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          <h1 className="font-display text-h1 text-text-1">
            You set the boundaries. I work inside them.
          </h1>
          <p className="mt-2 text-body text-text-2">Autonomy is a dial, not a leap.</p>
        </motion.div>

        <div className="mt-8 space-y-3">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.08 * (i + 1) }}
              className="flex flex-col gap-3 rounded-card border border-line-hairline bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-body-strong text-text-1">{row.label}</p>
                <p className="mt-0.5 text-caption text-text-3">{row.note}</p>
              </div>
              <LayoutGroup id={`dial-${row.key}`}>
                <AutonomyDial
                  value={autonomy[row.key] ?? 'Suggest'}
                  onChange={(level) => setAutonomy(row.key, level)}
                  className="shrink-0"
                />
              </LayoutGroup>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.44 }}
          className="mt-6 flex items-start gap-3 rounded-card border border-line-hairline bg-surface-1 p-4"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          <p className="text-small text-text-2">
            <span className="text-text-1">Active guardrails:</span> margin floor 12% · spend cap
            $200 · quiet hours 21:00–07:00. Guardrails always apply — at any autonomy level — and
            every action is logged and reversible.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.54 }}
          className="mt-8 flex justify-end"
        >
          <motion.button
            onClick={onEnter}
            className="rounded-chip bg-ember px-7 py-3 text-body-strong text-canvas"
            animate={{
              boxShadow: [
                `0 0 24px ${trgb('--ember-rgb', 0.15)}`,
                `0 0 24px ${trgb('--ember-rgb', 0.42)}`,
                `0 0 24px ${trgb('--ember-rgb', 0.15)}`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ y: -1, backgroundColor: cssVar('--ember-hi'), transition: { duration: 0.12 } }}
          >
            Enter Fraytline
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
