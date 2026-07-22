import { motion } from 'framer-motion';
import type { Movement } from '@/store';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Vertical spine of a Movement (§9.7): milestone nodes, leg segments,
 * border diamonds (warn), partner handoffs (double circle, teal).
 * Draws progressively on mount; collapsed tiers render as expander rows.
 */
export default function MovementSpine({ movement, className }: { movement: Movement; className?: string }) {
  type Node =
    | { kind: 'milestone'; label: string; time: string; status: 'done' | 'current' | 'upcoming' }
    | { kind: 'border'; label: string; time: string; waiting: boolean }
    | { kind: 'handoff'; label: string; time: string };

  const nodes: Node[] = [];
  movement.milestones.forEach((m) => {
    const border = movement.borders.find((b) => m.label.toLowerCase().includes(b.name.toLowerCase()));
    const isHandoff = /handoff/i.test(m.label);
    if (border) nodes.push({ kind: 'border', label: m.label, time: m.time, waiting: border.status === 'waiting' });
    else if (isHandoff) nodes.push({ kind: 'handoff', label: m.label, time: m.time });
    else nodes.push({ kind: 'milestone', label: m.label, time: m.time, status: m.status });
  });

  const currentIdx = nodes.findIndex((n) => n.kind === 'milestone' && n.status === 'current');

  return (
    <div className={cn('relative pl-6', className)}>
      {/* progress line */}
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-line-hairline" />
      <motion.div
        className="absolute left-[7px] top-2 w-px origin-top bg-ember"
        style={{ height: 'calc(100% - 16px)' }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: currentIdx >= 0 ? (currentIdx + 1) / nodes.length : 0.1 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <div className="space-y-4">
        {nodes.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: EASE }}
            className="relative flex items-baseline justify-between gap-3"
          >
            {n.kind === 'milestone' && (
              <span
                className={cn(
                  'absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-2',
                  n.status === 'done' && 'border-ember bg-ember',
                  n.status === 'current' && 'border-ember bg-canvas shadow-glow-ember',
                  n.status === 'upcoming' && 'border-line-strong bg-canvas',
                )}
              />
            )}
            {n.kind === 'border' && (
              <span
                className={cn(
                  'absolute -left-6 top-1 h-[15px] w-[15px] rotate-45 border-2 border-warn',
                  n.waiting ? 'bg-warn/30 animate-pulse-dot-slow' : 'bg-canvas',
                )}
              />
            )}
            {n.kind === 'handoff' && (
              <span className="absolute -left-6 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-teal bg-canvas">
                <span className="h-[7px] w-[7px] rounded-full border border-teal" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-small', n.kind === 'milestone' && n.status === 'upcoming' ? 'text-text-3' : 'text-text-1')}>
                {n.label}
              </span>
              {n.kind === 'border' && n.waiting && <span className="text-caption text-warn">border crossing · waiting</span>}
              {n.kind === 'handoff' && <span className="text-caption text-teal">responsibility transfer</span>}
            </span>
            <span className="shrink-0 font-mono text-data text-text-3">{n.time}</span>
          </motion.div>
        ))}
      </div>
      {movement.legs.length > 1 && (
        <div className="mt-3 text-caption text-text-3">
          ＋{movement.legs.length} legs · {movement.borders.length} border{movement.borders.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}
