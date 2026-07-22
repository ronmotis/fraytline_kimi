import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Camera, Check, Eraser, MapPin, PenLine } from 'lucide-react';
import { useStore, fmtMoney } from '@/store';
import type { Doc, Milestone, Movement } from '@/store';
import StatusPill from '@/components/StatusPill';
import DocChip from '@/components/DocChip';
import Materialize, { MatItem } from '@/components/quotes/Materialize';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const nowStamp = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Press-and-hold 600ms confirm — progress ring fills, scale pulse, then stamps. */
function HoldButton({ label, onComplete }: { label: string; onComplete: () => void }) {
  const progress = useMotionValue(0);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const [holding, setHolding] = useState(false);
  const dash = useTransform(progress, [0, 1], [100, 0]);

  const start = () => {
    setHolding(true);
    controlsRef.current = animate(progress, 1, {
      duration: 0.6,
      ease: 'linear',
      onComplete: () => { setHolding(false); progress.set(0); onComplete(); },
    });
  };
  const cancel = () => {
    controlsRef.current?.stop();
    animate(progress, 0, { duration: 0.15 });
    setHolding(false);
  };

  return (
    <motion.button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      animate={holding ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={holding ? { duration: 0.6, repeat: Infinity } : { duration: 0.15 }}
      className="relative flex min-h-[52px] w-full touch-none select-none items-center justify-center gap-2.5 overflow-hidden rounded-card bg-ember px-4 text-body-strong text-canvas"
    >
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
        <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(14,13,11,0.3)" strokeWidth="2.5" />
        <motion.circle
          cx="11" cy="11" r="9" fill="none" stroke="#0E0D0B" strokeWidth="2.5" strokeLinecap="round"
          pathLength={100} strokeDasharray="100 100" style={{ strokeDashoffset: dash }}
        />
      </svg>
      {label}
      <span className="text-[10px] font-normal opacity-75">hold 0.6s</span>
    </motion.button>
  );
}

/** Simple signature pad. */
function SignaturePad({ onInk }: { onInk: (has: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#F2EDE3';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="relative">
      <motion.canvas
        ref={ref}
        width={440}
        height={128}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ width: '100%', height: 128 }}
        className="touch-none rounded-card border border-line-hairline bg-surface-2"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = ref.current!.getContext('2d')!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current!.getContext('2d')!;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          onInk(true);
        }}
        onPointerUp={() => { drawing.current = false; }}
      />
      <button
        onClick={() => {
          const c = ref.current!;
          c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
          onInk(false);
        }}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-chip border border-line-hairline bg-surface-1 px-2 py-1 text-[10px] text-text-3 hover:text-text-1"
      >
        <Eraser className="h-3 w-3" /> clear
      </button>
      <span className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-text-3">sign here</span>
    </div>
  );
}

/**
 * Driver manifest (dispatch.md §5) — mobile-first single column, thumb-sized
 * targets, no money columns, no other movements.
 */
export default function DriverManifest() {
  const tenantId = useStore((s) => s.activeTenantId);
  const role = useStore((s) => s.role);
  const drivers = useStore((s) => s.drivers.filter((d) => d.tenantId === tenantId));
  const fleet = useStore((s) => s.fleet.filter((v) => v.tenantId === tenantId));
  const movements = useStore((s) => s.movements.filter((m) => m.tenantId === tenantId));
  const pushToast = useStore((s) => s.pushToast);

  const driver = drivers.find((d) => d.status === 'driving') ?? drivers[0];
  const vehicle = fleet.find((v) => v.id === driver?.vehicleId);
  const movement: Movement | undefined =
    movements.find((m) => m.driverName === driver?.name) ??
    movements.find((m) => m.vehiclePlate === vehicle?.plate);

  const [confirmed, setConfirmed] = useState<Record<string, { time: string; gps: string }>>({});
  const [podOpen, setPodOpen] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [podDone, setPodDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!driver || !movement) {
    return (
      <div className="mx-auto max-w-[520px] rounded-panel border border-line-hairline bg-surface-1 p-10 text-center text-caption text-text-3">
        No active run for this driver today.
      </div>
    );
  }

  const activeLeg = movement.legs.find((l) => l.status === 'active') ?? movement.legs[0];
  const isDone = (ms: Milestone) => ms.status === 'done' || !!confirmed[ms.id];
  const activeMs = movement.milestones.find((ms) => !isDone(ms));
  const allDone = movement.milestones.every(isDone) || movement.status === 'Delivered';

  const gpsFor = (i: number) =>
    tenantId === 'savannah'
      ? `6.68${70 + i}° N, 1.62${80 + i}° W`
      : `0.59${70 + i}° N, 34.76${80 + i}° E`;

  const confirmCheckpoint = (ms: Milestone, idx: number) => {
    setConfirmed((c) => ({ ...c, [ms.id]: { time: nowStamp(), gps: gpsFor(idx) } }));
    pushToast({ title: `${ms.label} confirmed`, body: `${nowStamp()} · GPS stamped · logged`, tone: 'ok' });
  };

  const docs: Doc[] = [
    { id: 'lic', name: 'Driver license', status: 'verified' },
    ...movement.docs.slice(0, 4),
  ];

  const advances = movement.moneyEvents.filter((e) => e.kind === 'advance');

  return (
    <div className="mx-auto max-w-[520px]">
      {/* 1 · header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex items-center gap-3 rounded-panel border border-line-hairline bg-surface-1 p-4"
      >
        {driver.avatar ? (
          <img src={driver.avatar} alt={driver.name} className="h-12 w-12 rounded-full border border-line-strong object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line-hairline bg-surface-2 font-mono text-small text-text-2">
            {driver.name.split(' ').map((n) => n[0]).join('')}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-display text-h3 text-text-1">{driver.name}</div>
          <div className="font-mono text-caption text-text-3">{vehicle?.plate ?? '—'} · {movement.id}</div>
        </div>
        <StatusPill status={movement.status} />
      </motion.div>

      {/* 2 · today's run */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3, ease: EASE }}
        className="mt-3 rounded-panel border border-line-hairline bg-surface-1 p-4"
      >
        <div className="text-micro uppercase text-text-3">Today's run</div>
        <div className="mt-1.5 font-display text-h2 text-text-1">
          Leg {activeLeg?.seq ?? 1} — {activeLeg?.from ?? movement.from} <span className="text-text-3">→</span> {activeLeg?.to ?? movement.to}
        </div>
        <div className="mt-1 flex items-center gap-3 font-mono text-caption text-text-2">
          {activeLeg?.distanceKm ? <span>{activeLeg.distanceKm} km</span> : null}
          {movement.nextMilestoneInH !== undefined && <span>eta {movement.nextMilestoneInH}h</span>}
          <span className="text-text-3">{driver.hoursLeft}h drive time left</span>
        </div>

        {/* checkpoints */}
        <div className="mt-4 space-y-2.5">
          {movement.milestones.map((ms, i) => {
            const done = isDone(ms);
            const isActive = activeMs?.id === ms.id;
            const conf = confirmed[ms.id];
            return (
              <motion.div
                key={ms.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 + i * 0.08, duration: 0.3, ease: EASE }}
                className={cn(
                  'rounded-card border p-3',
                  done ? 'border-ok/25 bg-ok/5' : isActive ? 'border-ember/40 bg-ember-dim/40' : 'border-line-hairline bg-surface-2/50 opacity-60',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('flex items-center gap-2 text-small', done ? 'text-ok' : 'text-text-1')}>
                    {done ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4 text-text-3" />}
                    {ms.label}
                  </span>
                  <span className="font-mono text-caption text-text-3">{conf?.time ?? ms.time}</span>
                </div>
                {conf && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-chip border border-teal/30 bg-teal-dim px-2 py-0.5 font-mono text-[10px] text-teal"
                  >
                    <MapPin className="h-3 w-3" /> {conf.gps}
                  </motion.div>
                )}
                {isActive && !done && (
                  <div className="mt-2.5">
                    <HoldButton label={`${ms.label} — confirm`} onComplete={() => confirmCheckpoint(ms, i)} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 3 · docs wallet */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.3, ease: EASE }}
        className="mt-3 rounded-panel border border-line-hairline bg-surface-1 p-4"
      >
        <div className="text-micro uppercase text-text-3">Docs wallet</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {docs.map((d) => <DocChip key={d.id} doc={d} />)}
        </div>
      </motion.div>

      {/* finance lens — advances visible */}
      {role === 'Finance' && advances.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3, ease: EASE }}
          className="mt-3 rounded-panel border border-line-hairline bg-surface-1 p-4"
        >
          <div className="text-micro uppercase text-text-3">Advances (Finance view)</div>
          <div className="mt-2 space-y-1.5">
            {advances.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-small">
                <span className="text-text-2">{a.label}</span>
                <span className="font-mono text-data text-text-1">{fmtMoney(a.value)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 5 · POD capture */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.3, ease: EASE }}
        className="mt-3 rounded-panel border border-line-hairline bg-surface-1 p-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-micro uppercase text-text-3">Proof of delivery</span>
          {!allDone && <span className="text-[10px] text-text-3">unlocks at destination</span>}
        </div>
        <AnimatePresence mode="wait">
          {podDone ? (
            <Materialize key="pod-done" className="mt-3 bg-surface-2 p-4">
              <MatItem className="flex items-center gap-2 text-small text-ok">
                <Check className="h-4 w-4" /> POD received · customer notified (approved template)
              </MatItem>
              <MatItem className="mt-1 text-caption text-text-3">
                settlement timer started ◈ net-30 · logged
              </MatItem>
            </Materialize>
          ) : allDone || podOpen ? (
            <motion.div key="pod-open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-3">
              <SignaturePad onInk={setHasInk} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setPhoto(f.name); pushToast({ title: 'Photo attached', body: f.name, tone: 'teal' }); }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-card border text-small transition-colors',
                    photo ? 'border-teal/40 bg-teal-dim text-teal' : 'border-line-strong text-text-2 hover:text-text-1',
                  )}
                >
                  <Camera className="h-4 w-4" /> {photo ?? 'Upload photo'}
                </button>
                <button
                  disabled={!hasInk && !photo}
                  onClick={() => {
                    setPodDone(true);
                    pushToast({
                      title: 'POD received',
                      body: 'customer notified (approved template) · settlement timer started ◈ net-30',
                      tone: 'ok',
                    });
                  }}
                  className={cn(
                    'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-card text-small font-medium transition-colors',
                    hasInk || photo ? 'bg-ember text-canvas hover:bg-ember-hi' : 'cursor-not-allowed bg-surface-3 text-text-3',
                  )}
                >
                  <PenLine className="h-4 w-4" /> Submit POD
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              key="pod-closed"
              onClick={() => setPodOpen(true)}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-small text-text-3 transition-colors hover:border-ember hover:text-ember"
            >
              <PenLine className="h-4 w-4" /> Capture signature / photo
            </button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 6 · conductor strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.3, ease: EASE }}
        className="mt-3 rounded-panel border border-teal/25 bg-teal-dim/40 p-4"
      >
        <div className="flex items-center gap-1.5 text-micro uppercase text-teal">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-dot" /> Conductor
        </div>
        <p className="mt-1.5 text-small text-text-1">
          {tenantId === 'savannah'
            ? 'Clear run to Kumasi — ETA 13:30 holds. Friday Tema gate queues run +3h ◈ — plan the next pickup early.'
            : 'Border wait trending 5.5h vs your 6.8h average — bond renewal is with Wanjiru. Rest stop suggestion: Busia services, 40 min ahead.'}
        </p>
        <div className="mt-2 text-[10px] text-text-3">logged · reversible</div>
      </motion.div>
    </div>
  );
}
