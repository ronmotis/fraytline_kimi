import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import type { Movement } from '@/store';
import { TODAY_IDX, WEEK_DAYS, barsForVehicle, utilization } from './dispatchUtils';
import type { GanttBar } from './dispatchUtils';
import { trgb, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const TONE_CLS: Record<GanttBar['tone'], string> = {
  Booked: 'bg-teal/30 border-teal/50 text-teal',
  'In Transit': 'bg-ember/25 border-ember/50 text-ember',
  'At Border': 'bg-warn/20 border-warn/50 text-warn',
  Exception: 'bg-danger/20 border-danger/50 text-danger',
  Delivered: 'bg-ok/15 border-ok/40 text-ok',
  Quoted: 'bg-quote/15 border-quote/40 text-quote',
  Draft: 'bg-transparent border-text-3/40 text-text-3 border-dashed',
  Settled: 'bg-transparent border-text-3/30 text-text-3',
  service: 'text-warn border-warn/40',
  proposed: 'bg-transparent border-teal/60 text-teal border-dashed',
};

/**
 * Fleet timeline strip (dispatch.md §2): 7-day gantt, rows = vehicles.
 * Bars grow from left (stagger 60ms); today line = pulsing ember hairline.
 * Right-edge drag proposes a reschedule (governed, snaps to day).
 */
export default function FleetTimeline({ proposed }: { proposed?: { movement: Movement; vehicleId: string } }) {
  useTheme(); // refresh service-stripe tint on theme flip
  const fleet = useStore((s) => s.fleet.filter((v) => v.tenantId === s.activeTenantId));
  const movements = useStore((s) => s.movements.filter((m) => m.tenantId === s.activeTenantId));
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => fleet.map((v) => {
      const bars = barsForVehicle(v, movements, proposed && proposed.vehicleId === v.id ? proposed.movement : undefined);
      const shifted = bars.map((b) => {
        const sh = shifts[b.key] ?? 0;
        if (sh === 0 || b.tone === 'service') return b;
        return {
          ...b,
          startIdx: Math.min(6, Math.max(0, b.startIdx + sh)),
          endIdx: Math.min(6, Math.max(0, b.endIdx + sh)),
        };
      });
      return { vehicle: v, bars: shifted, util: utilization(shifted) };
    }),
    [fleet, movements, proposed, shifts],
  );

  const colWidth = () => (gridRef.current ? gridRef.current.clientWidth / 7 : 100);

  const onReschedule = (bar: GanttBar, offsetX: number) => {
    const days = Math.round(offsetX / colWidth());
    if (days === 0) return;
    setShifts((s) => ({ ...s, [bar.key]: (s[bar.key] ?? 0) + days }));
    pushToast({
      title: `Reschedule ${bar.movementId ?? bar.label} — conflict check ✓`,
      body: `${days > 0 ? '+' : ''}${days}d · approve in the Autonomy queue`,
      tone: 'ember',
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-panel border border-line-hairline bg-surface-1 p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-micro uppercase text-text-3">Fleet timeline · Mon 19 — Sun 25 May</span>
        <span className="text-[10px] text-text-3">dashed = proposed · hashed = service window · drag bar edge to propose reschedule</span>
      </div>

      <div className="relative grid grid-cols-[130px_1fr] gap-x-3">
        {/* today hairline — pulsing ember, spans the full gantt height */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pointer-events-none absolute inset-y-0 z-10 w-px animate-pulse-dot-slow bg-ember"
          style={{ left: `calc(142px + (100% - 142px) * ${(TODAY_IDX + 0.45) / 7})` }}
        />
        {/* day header */}
        <div />
        <div ref={gridRef} className="relative grid grid-cols-7">
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                'border-l border-line-hairline px-1.5 pb-1 font-mono text-[10px]',
                i === TODAY_IDX ? 'text-ember' : 'text-text-3',
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* rows */}
        {rows.map(({ vehicle, bars, util }, ri) => (
          <div key={vehicle.id} className="contents">
            <div className="flex h-[30px] items-center gap-1.5 border-t border-line-hairline pr-2">
              <span className="font-mono text-[11px] text-text-1">{vehicle.plate}</span>
              <span className="truncate text-[9px] text-text-3">{Math.round(util * 100)}%</span>
            </div>
            <div className="relative h-[30px] border-t border-line-hairline">
              {/* day grid lines */}
              <div className="absolute inset-0 grid grid-cols-7">
                {WEEK_DAYS.map((d) => <div key={d} className="border-l border-line-hairline/60" />)}
              </div>
              {/* bars */}
              {bars.map((bar, bi) => (
                <motion.div
                  key={bar.key}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: ri * 0.05 + bi * 0.06, duration: 0.4, ease: EASE }}
                  style={{
                    originX: 0,
                    left: `${(bar.startIdx / 7) * 100}%`,
                    width: `${((bar.endIdx - bar.startIdx + 1) / 7) * 100}%`,
                    backgroundImage: bar.tone === 'service' ? `repeating-linear-gradient(45deg, ${trgb('--warn-rgb', 0.12)} 0 4px, transparent 4px 8px)` : undefined,
                  }}
                  className={cn(
                    'group absolute top-[5px] flex h-5 items-center overflow-visible rounded border px-1.5 font-mono text-[9px]',
                    TONE_CLS[bar.tone],
                    bar.movementId && 'cursor-pointer',
                  )}
                  onClick={() => bar.movementId && bar.tone !== 'proposed' && navigate(`/movements/${bar.movementId}`)}
                >
                  <span className="truncate">{bar.label}</span>
                  {/* glass tooltip */}
                  <span className="glass pointer-events-none absolute -top-9 left-0 z-40 hidden whitespace-nowrap rounded-chip border border-line-strong px-2 py-1 text-[10px] text-text-1 shadow-modal group-hover:block">
                    {bar.tooltip} · util {Math.round(util * 100)}%
                  </span>
                  {/* reschedule edge */}
                  {bar.movementId && bar.tone !== 'service' && (
                    <motion.span
                      drag="x"
                      dragSnapToOrigin
                      dragElastic={0}
                      dragMomentum={false}
                      onDragEnd={(_, info) => onReschedule(bar, info.offset.x)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize rounded-full bg-text-3/0 transition-colors hover:bg-ember/60"
                      title="drag to propose reschedule"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
