import { motion } from 'framer-motion';
import { CharReveal, WordReveal } from './bits';
import { SPRING_SNAPPY } from './types';

/**
 * Step 0 — Welcome (onboarding.md §Step 0).
 * Char-level headline (≤20 chars/line), word-level sub, breathing ember CTA.
 */
export default function StepWelcome({
  onBegin,
  onSample,
}: {
  onBegin: () => void;
  onSample: () => void;
}) {
  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-[760px]">
        <motion.p
          className="text-micro uppercase text-teal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          FRAYTLINE · OPERATING SYSTEM FOR FREIGHT
        </motion.p>

        <h1 className="mt-6 font-display text-display-xl text-text-1">
          <span className="block">
            <CharReveal text="This is not software." delay={0.1} />
          </span>
          <span className="block">
            <CharReveal text="It's your business," accent="your" delay={0.5} />
          </span>
          <span className="block">
            <CharReveal text="understood." delay={0.95} />
          </span>
        </h1>

        <p className="mt-6 max-w-[620px] text-body text-text-2">
          <WordReveal
            text="In the next few minutes, Fraytline will learn how your operation actually runs — your lanes, your rates, your people — and build an operating system around it. One system. Local today, cross-border when you are."
            delay={1.35}
          />
        </p>

        <motion.div
          className="mt-10 flex items-center gap-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING_SNAPPY, delay: 1.7 }}
        >
          <motion.button
            onClick={onBegin}
            className="rounded-chip bg-ember px-7 py-3 text-body-strong text-canvas"
            animate={{
              boxShadow: [
                '0 0 24px rgba(232,145,45,0.15)',
                '0 0 24px rgba(232,145,45,0.42)',
                '0 0 24px rgba(232,145,45,0.15)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ y: -1, backgroundColor: '#F5A94B', transition: { duration: 0.12 } }}
          >
            Begin
          </motion.button>
          <button
            onClick={onSample}
            className="text-small text-text-2 underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-teal"
          >
            Explore with sample data (Meridian Freight, Nairobi)
          </button>
        </motion.div>
      </div>
    </div>
  );
}
