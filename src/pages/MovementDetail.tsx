// /movements/:id — the flagship detail (movements.md PART B).
// Route header · scroll-scrubbed Movement Spine (GSAP, inside the panel) ·
// tabbed right rail (Documents / Money / Parties / Exceptions) · Conductor strip.
// "View as: Simple | Full" collapses tiers L1–L4 live — regional = local + revealed
// complexity. Tier render rule: a tier renders only when data exists.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Copy, Download, MessageSquare, MoreHorizontal, Play, Plus,
} from 'lucide-react';
import { useStore, useActiveTenant, fmtMoney } from '@/store';
import type { Movement } from '@/store';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import LiveMap from '@/components/LiveMap';
import type { MapBorderNode, MapRoute } from '@/components/LiveMap';
import ApprovalCard from '@/components/ApprovalCard';
import SpineScroller from '@/components/movements/SpineScroller';
import RailTabs from '@/components/movements/RailTabs';
import type { LocalException, RailTab } from '@/components/movements/RailTabs';
import ConductorStrip from '@/components/movements/ConductorStrip';
import DocDrawer from '@/components/movements/DocDrawer';
import type { DocDrawerTarget } from '@/components/movements/DocDrawer';
import AddExceptionModal from '@/components/movements/AddExceptionModal';
import { BORDER_COORDS, corridorCurrencies, docProgress, movementTiers, routePoints, totalKm } from '@/components/movements/geo';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING_PANEL = { type: 'spring', stiffness: 220, damping: 26 } as const;

export default function MovementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenant = useActiveTenant();
  const role = useStore((s) => s.role);
  const movement = useStore((s) => s.movements.find((m) => m.id === id));
  const approvals = useStore((s) => s.approvals);
  const fleet = useStore((s) => s.fleet);
  const pushToast = useStore((s) => s.pushToast);
const startTrip = useStore((s) => s.startTrip);
const canAssign = useStore((s) => s.can('assign'));

  const [view, setView] = useState<'full' | 'simple'>('full');
  const [railTab, setRailTab] = useState<RailTab | null>(null);
  const [drawer, setDrawer] = useState<DocDrawerTarget | null>(null);
  const [exceptionPop, setExceptionPop] = useState<{ x: number; y: number } | null>(null);
  const [exceptionModal, setExceptionModal] = useState(false);
  const [localExceptions, setLocalExceptions] = useState<LocalException[]>([]);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const portal = role === 'Customer';
  const simple = portal || view === 'simple';

  const tiers = useMemo(() => (movement ? movementTiers(movement) : null), [movement]);
  const pendingException = approvals.find(
    (a) => a.movementId === movement?.id && a.kind === 'expense' && a.status === 'pending',
  );
  const movementApprovals = approvals.filter((a) => a.movementId === movement?.id && a.status === 'pending');

  // ---- role lens: driver goes straight to the manifest ----
  if (role === 'Driver') return <Navigate to="/dispatch" replace />;

  if (!movement || movement.tenantId !== tenant.id || !tiers) {
    return (
      <EmptyState
        title="Movement not in view"
        body={`${id ?? 'This movement'} isn't part of ${tenant.name}'s book — switch tenants or pick another movement.`}
        actionLabel="Back to Movements"
        onAction={() => navigate('/movements')}
      />
    );
  }

  // ---- derived header data ----
  const km = totalKm(movement);
  const currencies = corridorCurrencies(movement);
  const [docsDone, docsTotal] = docProgress(movement);
  const waitingBorder = movement.borders.find((b) => b.status === 'waiting');
  const doneMilestones = movement.milestones.filter((m) => m.status === 'done').length;
  const hasPartnerLeg = movement.legs.some((l) => l.partnerName);

  const statParts: string[] = [];
  if (km > 0) statParts.push(`${km.toLocaleString()} km`);
  statParts.push(`${movement.legs.length} leg${movement.legs.length === 1 ? '' : 's'}`);
  if (movement.borders.length > 0) statParts.push(`${movement.borders.length} border${movement.borders.length === 1 ? '' : 's'}`);
  if (currencies.length > 1) statParts.push(`${currencies.length} currencies`);

  // ---- tab set: render rule — a tier renders only when data exists ----
  const tabs: RailTab[] = portal
    ? ['docs']
    : [
        'docs',
        ...(tiers.L3 ? (['money'] as RailTab[]) : []),
        'parties',
        'exceptions',
      ];
  const defaultTab: RailTab =
    railTab ?? (role === 'Dispatcher' ? 'exceptions' : role === 'Finance' && tiers.L3 ? 'money' : 'docs');

  // ---- mini-map ----
  const mapRoutes: MapRoute[] = [
    {
      id: movement.id,
      points: routePoints(movement),
      tone: movement.status === 'In Transit' || movement.status === 'At Border' ? 'ember' : 'planned',
      pulses: movement.status === 'Draft' || movement.status === 'Quoted' ? 0 : 2,
      label: `${movement.from} → ${movement.to}`,
    },
  ];
  const mapBorders: MapBorderNode[] = movement.borders
    .filter((b) => BORDER_COORDS[b.name])
    .map((b) => ({
      name: b.name,
      coords: BORDER_COORDS[b.name],
      tone: b.status === 'cleared' ? 'ok' : 'warn',
      pulsing: b.status === 'waiting',
    }));
  const vehicle = fleet.find((v) => v.plate === movement.vehiclePlate);

  const route = `${movement.from} → ${movement.to}`;

  return (
    <div>
      {/* B1 — header */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/movements')}
          className="mb-3 flex items-center gap-1.5 text-caption text-text-3 transition-colors hover:text-text-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Movements
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/* eyebrow micro */}
            <div className="text-micro uppercase text-text-3">
              Movement · {movement.id} · {movement.customer}
              {movement.id === 'MR-2481' ? ' · REF BID-8842' : ''}
            </div>

            {/* display route — char-level reveal, 16ms/char */}
            <h1 className="mt-1 font-display text-display text-text-1" aria-label={route}>
              {route.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.016, duration: 0.24, ease: EASE }}
                  className="inline-block whitespace-pre"
                >
                  {ch}
                </motion.span>
              ))}
            </h1>

            {/* jurisdiction chips (stagger 50ms) — only when jurisdictions exist */}
            {movement.flags.length > 1 && (
              <div className="mt-2 flex gap-1.5">
                {movement.flags.map((f, i) => (
                  <motion.span
                    key={f}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.24, ease: EASE }}
                    className="rounded-chip border border-line-hairline bg-surface-1 px-2 py-0.5 font-mono text-[11px] text-text-2"
                  >
                    {f}
                  </motion.span>
                ))}
              </div>
            )}

            {/* mono stat line */}
            <div className="mt-2 font-mono text-data text-text-3">{statParts.join(' · ')}</div>

            {/* status + progress */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2">
                <StatusPill status={movement.status} />
                {waitingBorder && <span className="text-caption text-warn">— {waitingBorder.name}</span>}
              </span>
              <span className="flex min-w-52 flex-1 items-center gap-2 sm:max-w-xs">
                <span className="relative h-px flex-1 bg-line-strong">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${movement.progress * 100}%` }}
                    transition={{ duration: 0.9, ease: EASE }}
                    className="absolute left-0 top-0 h-px bg-ember"
                  />
                  {/* milestone ticks pop as passed */}
                  {movement.milestones.map((m, i) => {
                    const left = movement.milestones.length > 1 ? (i / (movement.milestones.length - 1)) * 100 : 0;
                    const passed = m.status === 'done';
                    return (
                      <motion.span
                        key={m.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 380, damping: 30 }}
                        style={{ left: `${left}%` }}
                        className={cn(
                          'absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border',
                          passed ? 'border-ember bg-ember' : m.status === 'current' ? 'border-ember bg-canvas shadow-glow-ember' : 'border-line-strong bg-canvas',
                        )}
                        title={m.label}
                      />
                    );
                  })}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-text-3">
                  {doneMilestones}/{movement.milestones.length}
                </span>
              </span>
            </div>
          </div>

          {/* right cluster — view toggle + actions */}
          <div className="flex flex-col items-end gap-2.5">
            {!portal && (
              <ViewToggle view={view} onChange={setView} />
            )}
            {/* Finance lens: margin + advances promoted to header chips */}
            {role === 'Finance' && (
              <div className="flex gap-1.5">
                {movement.margin && (
                  <span className="rounded-chip border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[11px] text-ok">
                    margin {fmtMoney(movement.margin)}
                  </span>
                )}
                {movement.moneyEvents.some((e) => e.kind === 'advance' && e.status === 'pending') && (
                  <span className="rounded-chip border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">
                    advance pending
                  </span>
                )}
              </div>
            )}
            {!portal && (
              <div className="flex items-center gap-1.5">
                {movement.status === 'Booked' && (
                  <button
                    onClick={() => startTrip(movement.id)}
                    disabled={!movement.vehiclePlate || !canAssign}
                    title={
                      !movement.vehiclePlate
                        ? 'Assign a truck & driver in Dispatch first'
                        : !canAssign
                          ? 'Departures need an Owner or Dispatcher sign-in'
                          : `Depart ${movement.from} now`
                    }
                    className="flex items-center gap-1.5 rounded-chip bg-ember px-2.5 py-1.5 text-caption font-medium text-canvas transition-colors hover:bg-ember-hi disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-3.5 w-3.5" /> Start trip
                  </button>
                )}
                <button
                  onClick={() => pushToast({ title: `Message drafted to ${movement.driverName ?? 'driver'}`, body: 'Conductor will send inside the 07:00–21:00 window', tone: 'teal' })}
                  className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:text-text-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Message driver
                </button>
                <button
                  onClick={() => { setRailTab('exceptions'); setExceptionModal(true); }}
                  className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:text-text-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Exception
                </button>
                <button
                  onClick={() => pushToast({ title: 'Docs pack exported', body: `${docsDone}/${docsTotal} documents · PDF`, tone: 'ok' })}
                  className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:text-text-1"
                >
                  <Download className="h-3.5 w-3.5" /> Docs pack
                </button>
                <span className="relative">
                  <button
                    onClick={() => setOverflowOpen((v) => !v)}
                    className="rounded-chip border border-line-strong p-1.5 text-text-2 transition-colors hover:text-text-1"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <AnimatePresence>
                    {overflowOpen && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="glass absolute right-0 top-full z-50 mt-1 block w-52 rounded-card border border-line-strong p-1.5 shadow-modal"
                      >
                        {[
                          { icon: Copy, label: 'Duplicate as quote', run: () => pushToast({ title: 'Draft quote duplicated', body: route, tone: 'teal' }) },
                          { icon: Download, label: 'Export docs pack', run: () => pushToast({ title: 'Docs pack exported', body: `${docsDone}/${docsTotal} documents · PDF`, tone: 'ok' }) },
                          { icon: MessageSquare, label: 'Message driver', run: () => pushToast({ title: `Message drafted to ${movement.driverName ?? 'driver'}`, tone: 'teal' }) },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => { item.run(); setOverflowOpen(false); }}
                            className="flex w-full items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-small text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
                          >
                            <item.icon className="h-3.5 w-3.5" /> {item.label}
                          </button>
                        ))}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* simple-view caption */}
        <AnimatePresence>
          {simple && !portal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_PANEL}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-card border border-teal/25 bg-teal-dim/40 px-3 py-2 text-caption text-teal">
                Same movement. Fraytline reveals only the complexity that exists — or that you ask for.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* B2 + B3 — spine (7 cols) + right rail (5 cols) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7">
          {/* mini-map — collapses with the tiers in Simple view */}
          <AnimatePresence initial={false} mode="wait">
            {!simple && (
              <motion.div
                key="map"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING_PANEL}
                className="mb-4 overflow-hidden"
              >
                <LiveMap
                  mapAsset={tenant.mapAsset}
                  routes={mapRoutes}
                  vehicles={vehicle ? [vehicle] : []}
                  borders={mapBorders}
                  height={150}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* spine remounts on tier toggle → redraws in 600ms */}
          <SpineScroller
            key={`${movement.id}-${simple ? 'simple' : 'full'}`}
            movement={movement}
            simple={simple}
            className="h-[calc(100dvh-330px)] min-h-[420px]"
            pendingException={portal ? undefined : pendingException}
            onExceptionClick={(pos) => setExceptionPop(pos)}
            onOpenDossier={(border) => setDrawer({ border })}
          />

          {/* B5 — calm caption when a tier simply doesn't exist */}
          {!simple && !tiers.L2 && !hasPartnerLeg && (
            <div className="mt-3 text-caption text-text-3">
              This movement has no borders or handoffs — so you don't see any.
            </div>
          )}
        </div>

        <div className="col-span-12 xl:col-span-5">
          <AnimatePresence initial={false} mode="wait">
            {simple ? (
              <motion.div
                key="overview"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING_PANEL}
                className="overflow-hidden"
              >
                <SimpleOverview movement={movement} docsDone={docsDone} docsTotal={docsTotal} portal={portal} />
              </motion.div>
            ) : (
              <motion.div
                key="tabs"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING_PANEL}
                className="overflow-hidden"
              >
                <RailTabs
                  movement={movement}
                  tabs={tabs}
                  defaultTab={defaultTab}
                  pendingException={pendingException}
                  portal={portal}
                  onOpenDrawer={setDrawer}
                  localExceptions={localExceptions}
                  onRaiseException={() => setExceptionModal(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* B4 — Conductor strip */}
      <div className="mt-6">
        <ConductorStrip movement={movement} movementApprovals={portal ? [] : movementApprovals} />
      </div>

      {/* exception chip → ApprovalCard popover */}
      <AnimatePresence>
        {exceptionPop && pendingException && (
          <>
            <motion.div
              key="ex-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setExceptionPop(null)}
              className="fixed inset-0 z-[75]"
            />
            <motion.div
              key="ex-pop"
              initial={{ opacity: 0, scale: 0.97, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.2, ease: EASE }}
              style={{
                position: 'fixed',
                left: Math.min(exceptionPop.x, window.innerWidth - 400),
                top: Math.min(exceptionPop.y, window.innerHeight - 380),
              }}
              className="glass z-[80] w-[380px] rounded-card border border-line-strong p-3 shadow-modal"
            >
              <ApprovalCard action={pendingException} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DocDrawer movement={movement} target={drawer} onClose={() => setDrawer(null)} />
      <AddExceptionModal
        movement={movement}
        open={exceptionModal}
        onClose={() => setExceptionModal(false)}
        onRaised={(ex) => {
          setLocalExceptions((l) => [...l, ex]);
          setRailTab('exceptions');
        }}
      />
    </div>
  );
}

// ---------- "View as: Simple | Full" toggle ----------

function ViewToggle({ view, onChange }: { view: 'full' | 'simple'; onChange: (v: 'full' | 'simple') => void }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-micro uppercase text-text-3">View as</span>
      <span className="flex items-center rounded-chip border border-line-hairline bg-surface-1 p-0.5">
        {(['simple', 'full'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              'relative rounded-[5px] px-3 py-1 text-caption capitalize transition-colors',
              view === v ? 'text-text-1' : 'text-text-3 hover:text-text-2',
            )}
          >
            {view === v && (
              <motion.span
                layoutId="complexity-toggle-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-[5px] bg-surface-3 shadow-[inset_0_0_0_1px_var(--line-strong)]"
              />
            )}
            <span className="relative">{v === 'simple' ? 'Simple' : 'Full'}</span>
          </button>
        ))}
      </span>
    </span>
  );
}

// ---------- Simple-view L0 overview card ----------

function SimpleOverview({
  movement,
  docsDone,
  docsTotal,
  portal,
}: {
  movement: Movement;
  docsDone: number;
  docsTotal: number;
  portal?: boolean;
}) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Status', value: <StatusPill status={movement.status} /> },
    { label: 'Driver', value: movement.driverName ?? 'Unassigned' },
    { label: 'Truck', value: <span className="font-mono">{movement.vehiclePlate ?? '—'}</span> },
    { label: 'Cargo', value: movement.cargo },
    {
      label: 'Next',
      value: (
        <span className="font-mono">
          {movement.nextMilestone ?? '—'}
          {movement.nextMilestoneInH !== undefined && <span className="text-text-3"> · {movement.nextMilestoneInH}h</span>}
        </span>
      ),
    },
    { label: 'Docs', value: <span className="font-mono">{docsDone}/{docsTotal}</span> },
  ];
  return (
    <div className="rounded-panel border border-line-hairline bg-surface-1 p-4">
      <div className="mb-3 text-micro uppercase text-text-3">
        {portal ? 'Your shipment' : 'Overview · core'}
      </div>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.24, ease: EASE }}
            className="flex items-center justify-between gap-3 text-small"
          >
            <span className="text-text-3">{r.label}</span>
            <span className="text-text-1">{r.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
