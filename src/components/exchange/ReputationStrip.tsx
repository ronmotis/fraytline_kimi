// Reputation strip (exchange.md §5): ledger-computed operator stats + trust badge.
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useActiveTenant } from '@/store';
import MemoryChip from '@/components/MemoryChip';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function Tick({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: EASE });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

interface Stat { label: string; value: number; format: (v: number) => string }

const STATS: Record<string, { stats: Stat[]; badge: string; corridor: string }> = {
  meridian: {
    stats: [
      { label: 'On-time', value: 94.2, format: (v) => `${v.toFixed(1)}%` },
      { label: 'Docs complete', value: 98, format: (v) => `${Math.round(v)}%` },
      { label: 'Avg response', value: 22, format: (v) => `${Math.round(v)} min` },
      { label: 'Payment speed', value: 9, format: (v) => `${Math.round(v)} days` },
      { label: 'Jobs via Exchange', value: 23, format: (v) => `${Math.round(v)}` },
    ],
    badge: 'Trusted Operator',
    corridor: 'Corridor: East Africa',
  },
  savannah: {
    stats: [
      { label: 'On-time', value: 96.1, format: (v) => `${v.toFixed(1)}%` },
      { label: 'Docs complete', value: 100, format: (v) => `${Math.round(v)}%` },
      { label: 'Avg response', value: 31, format: (v) => `${Math.round(v)} min` },
      { label: 'Payment speed', value: 14, format: (v) => `${Math.round(v)} days` },
      { label: 'Jobs via Exchange', value: 7, format: (v) => `${Math.round(v)}` },
    ],
    badge: 'Trusted Operator',
    corridor: 'Corridor: Ghana',
  },
};

export default function ReputationStrip() {
  const tenant = useActiveTenant();
  const rep = STATS[tenant.id] ?? STATS.meridian;

  return (
    <section className="mt-10">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.24, ease: EASE }}
        className="font-display text-h2 text-text-1"
      >
        Your network reputation — computed from your ledger, not reviews.
      </motion.h2>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {rep.stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: i * 0.07, duration: 0.3, ease: EASE }}
            className="rounded-card border border-line-hairline bg-surface-1 p-5"
          >
            <div className="text-micro uppercase text-text-3">{s.label}</div>
            <div className="mt-1.5 font-mono text-data-lg text-text-1">
              <Tick value={s.value} format={s.format} />
            </div>
          </motion.div>
        ))}

        {/* trust badge card — border draws itself */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ delay: 0.35, duration: 0.3, ease: EASE }}
          className="relative col-span-2 overflow-hidden rounded-card bg-surface-1 p-5 md:col-span-1"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
            className="absolute inset-x-0 top-0 h-px origin-left bg-teal"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
            className="absolute inset-x-0 bottom-0 h-px origin-right bg-teal"
          />
          <div className="flex items-center gap-2 text-teal">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-body-strong">{rep.badge}</span>
          </div>
          <div className="mt-1 text-caption text-text-2">{rep.corridor}</div>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-3 flex flex-wrap items-center gap-2 text-caption text-text-2"
      >
        Every delivered movement updates this automatically
        <MemoryChip
          label="computed from settlement + delivery ledger"
          confidence={96}
          source="behavior"
          evidence={['on-time · docs · response · payment events']}
        />
        Partners see this when you bid.
      </motion.p>
    </section>
  );
}
