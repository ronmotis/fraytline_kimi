import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GripVertical, MapPin, ShieldAlert, ShieldCheck, Wrench, X } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { FleetUnit } from '@/store';
import StatusPill from '@/components/StatusPill';
import DocChip from '@/components/DocChip';
import Materialize, { MatItem } from '@/components/quotes/Materialize';
import { checkCompatibility, isUnassigned } from './dispatchUtils';
import type { Verdict } from './dispatchUtils';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

interface VerdictState {
  movementId: string;
  vehicleId: string;
  phase: 'thinking' | 'result';
  result?: Verdict;
}

/**
 * Assignment board (dispatch.md §3+§4): unassigned queue (draggable) · fleet grid
 * (drop targets) with the compatibility verdict engine on drop.
 */
export default function AssignBoard({
  preselectId,
  canDrag,
  onOpenManifest,
}: {
  preselectId?: string;
  canDrag: boolean;
  onOpenManifest: () => void;
}) {
  const fleet = useStore((s) => s.fleet.filter((v) => v.tenantId === s.activeTenantId));
  const drivers = useStore((s) => s.drivers.filter((d) => d.tenantId === s.activeTenantId));
  const tenantId = useStore((s) => s.activeTenantId);
  const movements = useStore((s) => s.movements.filter((m) => m.tenantId === s.activeTenantId));
  const assignDriver = useStore((s) => s.assignDriver);
  const checkPolicy = useStore((s) => s.checkPolicy);
  const pushToast = useStore((s) => s.pushToast);

  const queue = movements.filter(isUnassigned);

  const truckRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverTruck, setHoverTruck] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<VerdictState | null>(null);
  const [assigned, setAssigned] = useState<{ movementId: string; vehicleId: string } | null>(null);
  const thinkRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const driverOf = (v: FleetUnit) => drivers.find((d) => d.id === v.driverId);
  const dragMovement = dragId ? movements.find((m) => m.id === dragId) : undefined;

  // compatibility is visible before the drop
  const compat = useMemo(() => {
    if (!dragMovement) return null;
    const map: Record<string, boolean> = {};
    for (const v of fleet) map[v.id] = checkCompatibility(dragMovement, v, driverOf(v), fleet).ok;
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, fleet, movements]);

  const hitTest = (point: { x: number; y: number }): string | null => {
    for (const v of fleet) {
      const el = truckRefs.current[v.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) return v.id;
    }
    return null;
  };

  const runVerdict = (movementId: string, vehicleId: string) => {
    clearTimeout(thinkRef.current);
    setVerdict({ movementId, vehicleId, phase: 'thinking' });
    thinkRef.current = setTimeout(() => {
      const m = movements.find((x) => x.id === movementId);
      const v = fleet.find((x) => x.id === vehicleId);
      if (!m || !v) { setVerdict(null); return; }
      setVerdict({ movementId, vehicleId, phase: 'result', result: checkCompatibility(m, v, driverOf(v), fleet) });
    }, 300);
  };

  const confirmAssign = () => {
    if (!verdict) return;
    assignDriver(verdict.movementId, verdict.vehicleId);
    setAssigned({ movementId: verdict.movementId, vehicleId: verdict.vehicleId });
    setVerdict(null);
  };

  const assignedMovement = assigned ? movements.find((m) => m.id === assigned.movementId) : undefined;
  const assignedVehicle = assigned ? fleet.find((v) => v.id === assigned.vehicleId) : undefined;
  const assignedDriver = assignedVehicle ? driverOf(assignedVehicle) : undefined;
  const fuelAdvance = tenantId === 'savannah'
    ? { amount: 720, currency: 'GHS' as const }
    : { amount: 120, currency: 'USD' as const };
  const advanceCheck = checkPolicy({ kind: 'expense', amountUsd: 120 });

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* ---- unassigned queue ---- */}
      <section className="xl:col-span-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-micro uppercase text-text-3">Unassigned queue ({queue.length})</span>
          {!canDrag && <span className="text-[10px] text-text-3">view only · Dispatcher assigns</span>}
        </div>
        <div className="space-y-2.5">
          {queue.length === 0 && (
            <div className="rounded-card border border-dashed border-line-hairline p-6 text-center text-caption text-text-3">
              Everything is assigned. Convert a won quote and it lands here.
            </div>
          )}
          {queue.map((m, i) => (
            <motion.div
              key={m.id}
              layoutId={`queue-${m.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.3, ease: EASE }}
              drag={canDrag}
              dragSnapToOrigin
              dragElastic={0.12}
              whileDrag={canDrag ? { scale: 1.04, boxShadow: '0 0 24px rgba(232,145,45,0.25)', zIndex: 60 } : undefined}
              onDragStart={() => setDragId(m.id)}
              onDrag={(_, info) => setHoverTruck(hitTest(info.point))}
              onDragEnd={(_, info) => {
                const target = hitTest(info.point);
                setDragId(null);
                setHoverTruck(null);
                if (target) runVerdict(m.id, target);
              }}
              className={cn(
                'relative rounded-card border bg-surface-1 p-4 transition-colors duration-150',
                canDrag && 'cursor-grab active:cursor-grabbing',
                preselectId === m.id ? 'border-ember/60 shadow-glow-ember' : 'border-line-hairline hover:border-line-strong',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-data text-text-2">
                  {canDrag && <GripVertical className="h-3.5 w-3.5 text-text-3" />}
                  {m.id}
                </span>
                <StatusPill status={m.status} />
              </div>
              <div className="mt-1.5 font-display text-h3 text-text-1">
                {m.from} <span className="text-text-3">→</span> {m.to}
              </div>
              <div className="mt-0.5 text-caption text-text-2">
                {m.weightT}t · {m.cargo} · {m.milestones[0]?.time ?? 'TBD'} pickup
                {m.pickupIn ? ` (in ${m.pickupIn})` : ''}
              </div>
              <div className={cn('mt-2.5 flex flex-wrap gap-1.5 transition-opacity', dragId === m.id && 'opacity-100')}>
                {m.borders.length > 0 && (
                  <span className={cn('rounded-chip border px-2 py-0.5 text-[10px]', dragId === m.id ? 'border-warn/50 bg-warn/10 text-warn' : 'border-line-hairline text-text-3')}>
                    needs {tenantId === 'savannah' ? 'ECOWAS' : 'COMESA'}
                  </span>
                )}
                <span className={cn('rounded-chip border px-2 py-0.5 text-[10px]', dragId === m.id ? 'border-teal/50 bg-teal-dim text-teal' : 'border-line-hairline text-text-3')}>FTL</span>
                {m.from === 'Kampala' && m.to === 'Nairobi' && (
                  <span className={cn('rounded-chip border px-2 py-0.5 text-[10px]', dragId === m.id ? 'border-teal/50 bg-teal-dim text-teal' : 'border-teal/25 bg-teal-dim/50 text-teal')}>
                    ◈ backhaul window
                  </span>
                )}
              </div>
              {m.exceptionNote && (
                <div className="mt-2 flex items-center gap-1.5 text-caption text-danger">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse-dot" /> {m.exceptionNote}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* manifest materializes here after assignment */}
        <AnimatePresence>
          {assigned && assignedMovement && assignedVehicle && (
            <Materialize key={`${assigned.movementId}-${assigned.vehicleId}`} className="mt-4 bg-surface-1 p-4">
              <MatItem>
                <div className="flex items-center justify-between">
                  <span className="text-micro uppercase text-teal">Manifest generated</span>
                  <button onClick={() => setAssigned(null)} className="rounded p-1 text-text-3 hover:text-text-1"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-1.5 font-display text-h3 text-text-1">
                  {assigned.movementId} · {assignedVehicle.plate}
                  {assignedDriver ? ` · ${assignedDriver.name}` : ''}
                </div>
              </MatItem>
              <MatItem className="mt-2 flex flex-wrap gap-1.5">
                {(assignedMovement.docs.length > 0 ? assignedMovement.docs : [{ id: 'md-waybill', name: 'Waybill', status: 'pending' as const }]).slice(0, 4).map((d) => (
                  <DocChip key={d.id} doc={d} />
                ))}
              </MatItem>
              <MatItem className="mt-2.5 space-y-1">
                {assignedMovement.milestones.slice(0, 3).map((ms) => (
                  <div key={ms.id} className="flex items-center gap-2 text-caption text-text-2">
                    <span className="h-1 w-1 rounded-full bg-teal" /> {ms.label} · <span className="font-mono text-text-3">{ms.time}</span>
                  </div>
                ))}
              </MatItem>
              <MatItem className="mt-2.5 flex items-center gap-2 rounded-chip border border-ok/25 bg-ok/5 px-2.5 py-1.5 text-caption text-ok">
                <ShieldCheck className="h-3.5 w-3.5" />
                Fuel advance {fmtMoney(fuelAdvance)} — {advanceCheck.verdict === 'auto' ? 'inside guardrail → auto-approved, logged' : advanceCheck.reason}
              </MatItem>
              <MatItem className="mt-3 flex gap-2">
                <button
                  onClick={onOpenManifest}
                  className="rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
                >
                  Open driver manifest
                </button>
                <button
                  onClick={() => setAssigned(null)}
                  className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1"
                >
                  Done
                </button>
              </MatItem>
            </Materialize>
          )}
        </AnimatePresence>
      </section>

      {/* ---- fleet grid ---- */}
      <section className="xl:col-span-7">
        <div className="mb-2 text-micro uppercase text-text-3">Fleet · drop a movement on a truck</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fleet.map((v, i) => {
            const driver = driverOf(v);
            const isCompatible = compat?.[v.id];
            const dim = dragId && compat && !isCompatible;
            const highlight = (dragId && compat && isCompatible) || hoverTruck === v.id;
            const util = v.status === 'en-route' ? 0.62 : v.status === 'available' ? 0.34 : v.status === 'service-due' ? 0.1 : 0.22;
            const activeVerdict = verdict?.vehicleId === v.id ? verdict : null;
            return (
              <motion.div
                key={v.id}
                ref={(el) => { truckRefs.current[v.id] = el; }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{
                  opacity: dim ? 0.7 : 1,
                  scale: hoverTruck === v.id ? 1.02 : 1,
                  x: activeVerdict?.phase === 'result' && activeVerdict.result && !activeVerdict.result.ok ? [0, -4, 4, -4, 4, 0] : 0,
                }}
                transition={{
                  ...(hoverTruck === v.id ? SPRING : { delay: 0.5 + i * 0.05, duration: 0.3, ease: EASE }),
                  x: { duration: 0.3 },
                }}
                className={cn(
                  'relative rounded-card border bg-surface-1 p-4 transition-colors duration-150',
                  highlight ? 'border-teal/60' : 'border-line-hairline',
                  activeVerdict?.phase === 'result' && activeVerdict.result?.ok && 'shadow-glow-teal border-teal/60',
                  activeVerdict?.phase === 'result' && activeVerdict.result && !activeVerdict.result.ok && 'shadow-glow-danger border-danger/60',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-data text-text-1">{v.plate}</span>
                  <span className="text-caption text-text-3">{v.model}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-caption text-text-2">
                  {driver?.avatar ? (
                    <img src={driver.avatar} alt={driver.name} className="h-6 w-6 rounded-full border border-line-strong object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-hairline bg-surface-2 text-[9px] text-text-3">
                      {driver ? driver.name.split(' ').map((n) => n[0]).join('') : '—'}
                    </span>
                  )}
                  {driver?.name ?? 'no driver'}
                  <span className="text-text-3">· {driver ? `${driver.hoursLeft}h` : ''}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-caption text-text-3">
                  <MapPin className="h-3 w-3" />
                  {v.location}{v.availableAt ? ` · free ${v.availableAt}` : ''}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tenantId === 'meridian' && (
                    <span className="rounded-chip border border-ok/30 bg-ok/10 px-1.5 py-0.5 text-[10px] text-ok">COMESA ✓</span>
                  )}
                  <span className="rounded-chip border border-ok/30 bg-ok/10 px-1.5 py-0.5 text-[10px] text-ok">insurance ✓</span>
                  {v.serviceDueDays !== undefined && (
                    <span className="rounded-chip border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn">
                      service {v.serviceDueDays}d ⚠
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <div className="mb-1 flex justify-between text-[9px] uppercase tracking-[0.09em] text-text-3">
                    <span>utilization · week</span><span className="font-mono">{Math.round(util * 100)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-surface-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${util * 100}%` }}
                      transition={{ delay: 0.7 + i * 0.05, duration: 0.5, ease: EASE }}
                      className="h-full rounded-full bg-teal"
                    />
                  </div>
                </div>

                {/* verdict overlay */}
                <AnimatePresence>
                  {activeVerdict && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.24, ease: EASE }}
                      className="glass absolute inset-x-0 top-full z-50 mt-2 rounded-card border border-line-strong p-4 shadow-modal"
                    >
                      {activeVerdict.phase === 'thinking' ? (
                        <div className="flex items-center gap-2 text-caption text-teal">
                          <span className="inline-flex gap-1">
                            {[0, 1, 2].map((d) => (
                              <motion.span key={d} className="h-1 w-1 rounded-full bg-teal" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }} />
                            ))}
                          </span>
                          checking compatibility…
                        </div>
                      ) : activeVerdict.result?.ok ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-caption font-medium text-teal">
                            <ShieldCheck className="h-4 w-4" /> Compatible
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {activeVerdict.result.reasons.map((r, ri) => (
                              <motion.div
                                key={ri}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: ri * 0.06, duration: 0.24, ease: EASE }}
                                className="flex gap-2 text-caption text-text-2"
                              >
                                <span className="text-teal">✓</span> {r}
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={confirmAssign}
                              className="rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
                            >
                              Confirm assignment
                            </button>
                            <button onClick={() => setVerdict(null)} className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 hover:text-text-1">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 text-caption font-medium text-danger">
                            <ShieldAlert className="h-4 w-4" /> Blocked
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {activeVerdict.result?.blockers.map((b, bi) => (
                              <motion.div
                                key={bi}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: bi * 0.06, duration: 0.24, ease: EASE }}
                                className="flex gap-2 text-caption text-text-2"
                              >
                                <span className="text-danger">✗</span> {b}
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {activeVerdict.result?.fixes.map((f) => (
                              <button
                                key={f.label}
                                onClick={() => {
                                  if (f.kind === 'swap' && f.vehicleId) runVerdict(activeVerdict.movementId, f.vehicleId);
                                  else {
                                    setVerdict(null);
                                    pushToast({ title: 'Service move queued', body: '+2 days · $90 — approve in the Autonomy queue', tone: 'ember' });
                                  }
                                }}
                                className="flex items-center gap-1.5 rounded-chip border border-teal/40 bg-teal-dim px-2.5 py-1 text-caption text-teal transition-colors hover:border-teal"
                              >
                                {f.kind === 'service' && <Wrench className="h-3 w-3" />}
                                {f.label}
                              </button>
                            ))}
                            <button onClick={() => setVerdict(null)} className="rounded-chip border border-line-strong px-2.5 py-1 text-caption text-text-3 hover:text-text-1">
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
