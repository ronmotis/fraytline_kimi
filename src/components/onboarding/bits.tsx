import { useEffect, useRef } from 'react';
import { animate, motion } from 'framer-motion';
import { EASE_OUT_EXPO } from './types';
import { cn } from '@/lib/utils';

/** Character-level reveal for headlines ≤20 chars/line (design.md §6.2 text levels). */
export function CharReveal({
  text,
  delay = 0,
  stagger = 0.018,
  className,
  accent,
}: {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
  accent?: string; // substring rendered in ember
}) {
  const chars = text.split('');
  return (
    <motion.span
      className={cn('inline-block', className)}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {chars.map((c, i) => {
        const inAccent =
          accent && i >= text.indexOf(accent) && i < text.indexOf(accent) + accent.length;
        return (
          <motion.span
            key={i}
            aria-hidden
            className={cn('inline-block', inAccent && 'text-ember')}
            variants={{
              hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
              show: {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: { duration: 0.5, ease: EASE_OUT_EXPO },
              },
            }}
          >
            {c === ' ' ? ' ' : c}
          </motion.span>
        );
      })}
    </motion.span>
  );
}

/** Word-level reveal for sub-headlines / Conductor speech. */
export function WordReveal({
  text,
  delay = 0,
  stagger = 0.012,
  className,
}: {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
}) {
  const words = text.split(' ');
  return (
    <motion.span
      className={cn('inline', className)}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 6 },
            show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_EXPO } },
          }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Thinking — three 4px teal dots, sequential opacity pulse (600ms loop, 150ms offset). */
export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-teal"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

/** Number Tick — counts up 600ms ease-out-expo on mount (design.md §6.2.6). */
export function NumberTick({
  value,
  duration = 0.6,
  className,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span ref={ref} className={cn('font-mono tabular-nums', className)}>
      {prefix}0{suffix}
    </span>
  );
}
