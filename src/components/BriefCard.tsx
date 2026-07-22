import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import MemoryChip from './MemoryChip';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Narrative token: plain words, a strong span, or an inline memory citation. */
export type BriefToken =
  | { w: string }        // word(s)
  | { strong: string }   // emphasized
  | { factId: string };  // inline MemoryChip

export interface BriefAction {
  icon?: LucideIcon;
  label: string;
  tone?: 'ember' | 'teal' | 'ghost';
  onClick?: () => void;
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-teal"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/**
 * Conductor morning brief (§9.10): Living Border while generating,
 * word-level narrative reveal with inline MemoryChips, then action rows.
 */
export default function BriefCard({
  eyebrow = 'Conductor · overnight watch',
  tokens,
  actions = [],
  calm,
  calmText,
  className,
}: {
  eyebrow?: string;
  tokens: BriefToken[];
  actions?: BriefAction[];
  calm?: boolean;
  calmText?: string;
  className?: string;
}) {
  const [generating, setGenerating] = useState(true);
  const words = tokens.flatMap((t): BriefToken[] => ('w' in t ? t.w.split(' ').filter(Boolean).map((w) => ({ w })) : [t]));
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const g = setTimeout(() => setGenerating(false), 700);
    return () => clearTimeout(g);
  }, []);

  useEffect(() => {
    if (generating) return;
    if (revealed >= words.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 8);
    return () => clearTimeout(t);
  }, [generating, revealed, words.length]);

  const narrativeDone = !generating && revealed >= words.length;

  return (
    <div className={cn('rounded-panel', !narrativeDone && !calm && 'living-border', className)}>
      <div
        className={cn(
          'rounded-panel border bg-surface-1 p-6',
          narrativeDone || calm ? 'border-line-hairline' : 'border-transparent',
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className={cn('h-1.5 w-1.5 rounded-full bg-teal', !calm && 'animate-pulse-dot')} />
          <span className="text-micro uppercase text-teal">{eyebrow}</span>
        </div>

        {calm ? (
          <p className="text-body text-text-2">{calmText ?? 'Nothing needs you. Watching the operation.'}</p>
        ) : generating ? (
          <ThinkingDots />
        ) : (
          <p className="max-w-4xl text-body leading-relaxed text-text-2">
            {words.map((t, i) =>
              i < revealed ? (
                'factId' in t ? (
                  <MemoryChip key={i} factId={t.factId} className="mx-0.5 -translate-y-px" />
                ) : 'strong' in t ? (
                  <span key={i} className="font-medium text-text-1"> {t.strong} </span>
                ) : (
                  <span key={i}>{t.w} </span>
                )
              ) : (
                <span key={i} className="opacity-0">{'w' in t ? `${t.w} ` : 'strong' in t ? ` ${t.strong} ` : ' ◈ '}</span>
              ),
            )}
          </p>
        )}

        {narrativeDone && !calm && actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3, ease: EASE }}
                  onClick={a.onClick}
                  className={cn(
                    'flex items-center gap-1.5 rounded-chip px-3 py-1.5 text-small font-medium transition-colors',
                    a.tone === 'ember' && 'bg-ember text-canvas hover:bg-ember-hi',
                    a.tone === 'teal' && 'border border-teal/40 bg-teal-dim text-teal hover:border-teal',
                    (!a.tone || a.tone === 'ghost') && 'border border-line-strong text-text-2 hover:text-text-1',
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {a.label}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
