import { useId } from 'react';
import { motion } from 'framer-motion';
import type { FleetUnit } from '@/store';
import { cn } from '@/lib/utils';

export interface MapRoute {
  id: string;
  points: [number, number][];
  tone: 'ember' | 'teal' | 'planned';
  movementId?: string;
  pulses?: number; // Route Pulse dots (cap 3)
  label?: string;
}

export interface MapBorderNode {
  name: string;
  coords: [number, number];
  tone: 'warn' | 'teal' | 'ok';
  label?: string;
  pulsing?: boolean;
}

const TONE_COLOR = { ember: 'var(--ember)', teal: 'var(--teal)', planned: 'var(--text-3)' } as const;
const BORDER_COLOR = { warn: 'var(--warn)', teal: 'var(--teal)', ok: 'var(--ok)' } as const;

const pathFrom = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

/**
 * Hand-built SVG region map (§9.9): route polylines with Route Pulse dots,
 * ember vehicle chevrons, pulsing warn border diamonds, legend, glass tooltips.
 */
export default function LiveMap({
  mapAsset,
  routes,
  vehicles = [],
  borders = [],
  height = 420,
  weather,
  onRouteClick,
  className,
}: {
  mapAsset: string;
  routes: MapRoute[];
  vehicles?: FleetUnit[];
  borders?: MapBorderNode[];
  height?: number;
  weather?: { coords: [number, number]; radius: number; caption: string };
  onRouteClick?: (route: MapRoute) => void;
  className?: string;
}) {
  const uidSafe = useId().replace(/:/g, '');

  return (
    <div className={cn('relative w-full overflow-hidden rounded-panel border border-line-hairline bg-surface-1', className)} style={{ height }}>
      <svg viewBox="0 0 1200 900" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={`${uidSafe}-rain`}>
            <stop offset="0%" stopColor="var(--warn)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--warn)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <motion.image
          href={mapAsset}
          width="1200" height="900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />

        {weather && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <circle cx={weather.coords[0]} cy={weather.coords[1]} r={weather.radius} fill={`url(#${uidSafe}-rain)`} />
          </motion.g>
        )}

        {routes.map((r, ri) => {
          const d = pathFrom(r.points);
          const color = TONE_COLOR[r.tone];
          const dur = 3 + (ri % 3);
          return (
            <g key={r.id} onClick={() => onRouteClick?.(r)} className={onRouteClick ? 'cursor-pointer' : undefined}>
              <motion.path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={r.tone === 'planned' ? 1.5 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={r.tone === 'planned' ? '6 8' : undefined}
                opacity={r.tone === 'planned' ? 0.7 : 0.9}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.4 + ri * 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Route Pulse — dots travelling the path */}
              {(r.pulses ?? (r.tone === 'planned' ? 0 : 2)) > 0 &&
                Array.from({ length: Math.min(3, r.pulses ?? 2) }).map((_, i) => (
                  <circle key={i} r={4} fill={color}>
                    <animateMotion dur={`${dur}s`} begin={`${(i * dur) / Math.min(3, r.pulses ?? 2) + ri * 0.5}s`} repeatCount="indefinite" path={d} />
                  </circle>
                ))}
            </g>
          );
        })}

        {borders.map((b) => (
          <g key={b.name} transform={`translate(${b.coords[0]}, ${b.coords[1]})`}>
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.8 }}
            >
              <rect
                x={-8} y={-8} width={16} height={16}
                transform="rotate(45)"
                fill="var(--surface-1)"
                stroke={BORDER_COLOR[b.tone]}
                strokeWidth={2}
                className={b.pulsing ? 'animate-pulse-dot-slow' : undefined}
              />
              <text x={14} y={4} fontFamily="'JetBrains Mono', monospace" fontSize={12} fill="var(--text-2)" letterSpacing={1}>
                {b.name.toUpperCase()}{b.label ? ` · ${b.label}` : ''}
              </text>
            </motion.g>
          </g>
        ))}
      </svg>

      {/* vehicles — HTML overlay for glass tooltips */}
      {vehicles.map((v, i) => (
        <motion.div
          key={v.id}
          className="group absolute"
          style={{ left: `${(v.coords[0] / 1200) * 100}%`, top: `${(v.coords[1] / 900) * 100}%` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.9 + i * 0.08 }}
        >
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ transform: `rotate(${v.heading ?? 90}deg)` }}>
              <path d="M2 3 L16 9 L2 15 L6 9 Z" fill="var(--ember)" />
            </svg>
            <div className="absolute left-3 top-3 whitespace-nowrap font-mono text-[10px] text-text-2">{v.plate}</div>
            {/* glass tooltip */}
            <div className="glass pointer-events-none absolute left-4 top-4 z-20 w-44 rounded-card border border-line-strong p-2.5 opacity-0 shadow-modal transition-opacity duration-200 group-hover:opacity-100">
              <div className="font-mono text-data text-text-1">{v.plate} · {v.model}</div>
              <div className="mt-0.5 text-caption text-text-2">{v.location}</div>
              <div className="text-caption text-text-3">{v.status}{v.serviceDueDays ? ` · ${v.serviceDueDays}d` : ''}</div>
            </div>
          </div>
        </motion.div>
      ))}

      {weather && (
        <div className="absolute right-3 top-3 rounded-chip border border-warn/30 bg-warn/10 px-2 py-1 text-caption text-warn">
          {weather.caption}
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-2.5 left-3 flex items-center gap-3 text-micro uppercase text-text-3">
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-ember" /> active</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-teal" /> complete</span>
        <span className="flex items-center gap-1"><span className="h-0 w-4 border-t border-dashed border-text-3" /> planned</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rotate-45 border border-warn" /> border</span>
      </div>
    </div>
  );
}
