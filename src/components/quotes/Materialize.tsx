import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { trgb, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Canonical Materialize feedback (design.md §6.2.1) — used when the OS creates
 * an object (quote draft, movement, manifest):
 * 300ms teal shimmer sweep → border draws itself (stroke-dashoffset 1→0, 500ms)
 * → content fades/slides up 8px (300ms, stagger 40ms).
 *
 * Wrap items that should stagger in <MatItem>.
 */
export default function Materialize({
  children,
  className,
  borderClassName,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  borderClassName?: string;
  delay?: number;
}) {
  useTheme(); // refresh shimmer tint on theme flip
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04, delayChildren: delay + 0.55 } },
      }}
      className={cn('relative overflow-hidden rounded-card border border-transparent', className)}
    >
      {/* ghost outline base */}
      <div className={cn('pointer-events-none absolute inset-0 rounded-card border border-line-hairline', borderClassName)} />
      {/* teal shimmer sweep (300ms) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `linear-gradient(100deg, transparent 20%, ${trgb('--teal-rgb', 0.22)} 50%, transparent 80%)`,
        }}
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 0.3, delay, ease: 'linear' }}
      />
      {/* border draws itself (500ms, ease-out-expo) */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <motion.rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="9.5"
          fill="none"
          stroke="var(--teal)"
          strokeWidth="1"
          pathLength={1}
          strokeDasharray="1 1"
          initial={{ strokeDashoffset: 1, opacity: 1 }}
          animate={{ strokeDashoffset: 0, opacity: 0 }}
          transition={{
            strokeDashoffset: { duration: 0.5, delay: delay + 0.15, ease: EASE },
            opacity: { duration: 0.4, delay: delay + 0.7 },
          }}
        />
      </svg>
      {children}
    </motion.div>
  );
}

/** Item inside a Materialize container — fades/slides up 8px with the stagger. */
export function MatItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
