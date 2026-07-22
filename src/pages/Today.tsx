import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Bell, FileWarning, MessageSquare, ArrowLeftRight, ArrowRight, X,
} from 'lucide-react';
import {
  useStore, useActiveTenant, useTenantMovements, usePendingApprovals, fmtMoney,
} from '@/store';
import BriefCard from '@/components/BriefCard';
import type { BriefToken } from '@/components/BriefCard';
import MovementCard from '@/components/MovementCard';
import LiveMap from '@/components/LiveMap';
import type { MapRoute, MapBorderNode } from '@/components/LiveMap';
import StatusPill from '@/components/StatusPill';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

// ---------- Number Tick (§6.2.6) ----------

function Tick({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: EASE });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

// ---------- Pulse stat tile ----------

interface Stat {
  label: string;
  value: number;
  format: (v: number) => string;
  delta?: { label: string; tone: 'ok' | 'danger' | 'warn' | 'teal' };
  factId?: string;
  to?: string;
  spark?: number[];
}

function StatTile({ stat, index }: { stat: Stat; index: number }) {
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.4, ease: EASE }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => stat.to && navigate(stat.to)}
      className="relative rounded-card border border-line-hairline bg-surface-1 p-5 text-left transition-colors duration-150 hover:border-line-strong"
    >
      <div className="text-micro uppercase text-text-3">{stat.label}</div>
      <div className={cn('mt-1.5 font-mono text-data-lg', stat.delta?.tone === 'danger' ? 'text-danger' : 'text-text-1')}>
        <Tick value={stat.value} format={stat.format} />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-1.5 flex items-center gap-2"
      >
        {stat.delta && (
          <span
            className={cn(
              'rounded-chip px-1.5 py-0.5 text-[10px] font-medium',
              stat.delta.tone === 'ok' && 'bg-ok/10 text-ok',
              stat.delta.tone === 'danger' && 'bg-danger/10 text-danger',
              stat.delta.tone === 'warn' && 'bg-warn/10 text-warn',
              stat.delta.tone === 'teal' && 'bg-teal-dim text-teal',
            )}
          >
            {stat.delta.label}
          </span>
        )}
        {stat.factId && <MemoryChip factId={stat.factId} />}
      </motion.div>
      {/* sparkline on hover */}
      {stat.spark && hover && (
        <svg viewBox="0 0 100 28" className="absolute bottom-3 right-4 h-7 w-24">
          <motion.polyline
            points={stat.spark.map((v, i) => `${i * 25},${26 - v * 24}`).join(' ')}
            fill="none" stroke="var(--teal)" strokeWidth="1.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }}
          />
        </svg>
      )}
    </motion.button>
  );
}

// ---------- Attention queue ----------

type Severity = 'danger' | 'warn' | 'ember' | 'teal';

interface AttentionItem {
  id: string;
  severity: Severity;
  mono: string;
  text: string;
  factId?: string;
  countdown?: string;
  hours: number;
  category: 'movements' | 'borders' | 'approvals' | 'exchange' | 'memory' | 'fleet' | 'quotes';
  actionLabel: string;
  primary?: boolean;
  approvalId?: string;
  run?: () => void;
}

const SEV_ORDER: Record<Severity, number> = { danger: 0, warn: 1, ember: 2, teal: 3 };
const SEV_DOT: Record<Severity, string> = {
  danger: 'bg-danger', warn: 'bg-warn', ember: 'bg-ember', teal: 'bg-teal',
};

// ---------- Page ----------

export default function Today() {
  const tenant = useActiveTenant();
  const role = useStore((s) => s.role);
  const movements = useTenantMovements();
  const pending = usePendingApprovals();
  const approveAction = useStore((s) => s.approveAction);
  const assignDriver = useStore((s) => s.assignDriver);
  const pushToast = useStore((s) => s.pushToast);
  const fleet = useStore((s) => s.fleet.filter((v) => v.tenantId === s.activeTenantId));
  const navigate = useNavigate();

  const isSavannah = tenant.id === 'savannah';
  const ownerFirst = isSavannah ? 'Kwabena' : 'Wanjiru';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // role redirects (§Role-Aware Variations)
  useEffect(() => {
    if (role === 'Driver') navigate('/dispatch', { replace: true });
    else if (role === 'Customer') navigate('/movements/MR-2481', { replace: true });
  }, [role, navigate]);

  const [resolved, setResolved] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'severity' | 'time'>('severity');
  const [filter, setFilter] = useState<string | null>(null);
  const [layers, setLayers] = useState({ routes: true, vehicles: true, borders: true, weather: false });
  const [drawerMovement, setDrawerMovement] = useState<string | null>(null);

  const resolve = (id: string, toastTitle: string) => {
    setResolved((r) => [...r, id]);
    pushToast({ title: toastTitle, body: 'logged to Ledger', tone: 'ok', ledgerLink: true });
  };

  // ---- attention queue items (tenant-aware) ----
  const attentionItems: AttentionItem[] = useMemo(() => {
    if (isSavannah) {
      return [
        {
          id: 'sv-gr', severity: 'warn', mono: 'GR 5566-24', text: 'Service due in 2 days · Friday Kumasi run needs a unit', countdown: '2d', hours: 48,
          category: 'fleet', actionLabel: 'Resolve', run: undefined,
        },
        {
          id: 'sv-q', severity: 'ember', mono: 'Q-SV-01', text: 'Melcom opened 2×, no reply 1 day — nudge drafted', countdown: '1d', hours: 24,
          category: 'quotes', actionLabel: 'Send nudge',
        },
      ];
    }
    return [
      {
        id: 'at-bond', severity: 'danger', mono: 'MR-2481', text: 'EAC bond expires in 36h (regulated doc)', countdown: '36h', hours: 36,
        category: 'approvals', actionLabel: 'Approve $180', primary: true, approvalId: 'ap-bond',
      },
      {
        id: 'at-assign', severity: 'warn', mono: 'MR-2483', text: 'Backhaul unassigned — pickup in 26h', countdown: '26h', hours: 26,
        category: 'movements', actionLabel: 'Assign KDL 117C →', primary: role === 'Dispatcher',
      },
      {
        id: 'at-service', severity: 'warn', mono: 'KDM 930B', text: 'Service due in 5 days · 2 upcoming bookings conflict', countdown: '5d', hours: 120,
        category: 'fleet', actionLabel: 'Resolve',
      },
      {
        id: 'at-nudge', severity: 'ember', mono: 'Q-311', text: 'Bidco opened 3×, no reply 2 days', countdown: '2d', hours: 48,
        category: 'quotes', actionLabel: 'Send nudge',
      },
      {
        id: 'at-exchange', severity: 'teal', mono: 'EXCHANGE', text: '2 loads fit your backhaul (97 fit)', factId: 'f-lane-kla-nbo', countdown: 'Thu', hours: 72,
        category: 'exchange', actionLabel: 'Review',
      },
      {
        id: 'at-memory', severity: 'teal', mono: 'MEMORY', text: '3 new learnings to review (Sunday-departure pattern → rule?)', factId: 'f-pattern-sunday', countdown: 'new', hours: 96,
        category: 'memory', actionLabel: 'Review',
      },
    ];
  }, [isSavannah, role]);

  const visibleItems = attentionItems
    .filter((i) => !resolved.includes(i.id))
    .filter((i) => (i.approvalId ? pending.some((a) => a.id === i.approvalId) : true))
    .filter((i) => !filter || i.category === filter)
    .sort((a, b) => (sortMode === 'severity' ? SEV_ORDER[a.severity] - SEV_ORDER[b.severity] : a.hours - b.hours));

  const runItem = (item: AttentionItem) => {
    if (item.approvalId) { approveAction(item.approvalId); return; }
    switch (item.id) {
      case 'at-assign': assignDriver('MR-2483', 'v-kdl117c'); setResolved((r) => [...r, item.id]); break;
      case 'at-service': resolve(item.id, 'KDM 930B service scheduled Thu · bookings resequenced'); break;
      case 'sv-gr': resolve(item.id, 'GR 5566-24 workshop slot booked · GE 2210-22 covers Friday'); break;
      case 'at-nudge': resolve(item.id, 'Nudge sent to Bidco · tracking pixel armed'); break;
      case 'sv-q': resolve(item.id, 'Nudge sent to Melcom'); break;
      case 'at-exchange': navigate('/exchange'); break;
      case 'at-memory': navigate('/memory'); break;
      default: resolve(item.id, 'Resolved');
    }
  };

  // ---- brief narrative tokens ----
  const briefTokens: BriefToken[] = useMemo(() => {
    if (isSavannah) {
      return [
        { w: 'Yaw cleared the Tema gate at 05:50 — ahead of the Friday queue pattern' },
        { factId: 'f-pattern-tema' },
        { w: '.' }, { strong: 'SV-104' },
        { w: 'is on plan for Kumasi 13:30 with cocoa butter intact. A Kumasi→Accra timber load fits his Friday return —' },
        { strong: 'GH₵3,800, fit 88' },
        { w: '. And' }, { strong: 'Q-SV-01 (Melcom)' },
        { w: 'has been opened twice without a reply — a nudge usually closes them within a day' },
        { factId: 'f-customer-melcom' },
        { w: '. Nudge drafted.' },
      ];
    }
    const cashLead: BriefToken[] = role === 'Finance'
      ? [{ strong: '$9,240 in transit · 3 settlements due.' }, { w: ' ' }]
      : [];
    return [
      ...cashLead,
      { w: 'Overnight was quiet except Malaba.' }, { strong: 'MR-2481' },
      { w: 'reached the border at 04:12; current wait is trending 5.5h against your' },
      { factId: 'f-border-pref' },
      { w: '— Joseph is fine on hours. The EAC transit bond expires in' }, { strong: '36h' },
      { w: '; renewal ($180) is drafted and inside your spend guardrail, but it’s a regulated document, so it’s waiting for you.' },
      { strong: 'Two Exchange loads' },
      { w: 'match your Kampala→Nairobi backhaul window on Thursday — est. margin' }, { strong: '$640 combined' },
      { w: '. And' }, { strong: 'Q-311 (Bidco)' },
      { w: 'has been opened 3 times without a reply — historically that closes within 48h' },
      { factId: 'f-pricing-winrate' },
      { w: '. Nudge drafted.' },
    ];
  }, [isSavannah, role]);

  const briefActions = isSavannah
    ? [
        { icon: ArrowLeftRight, label: 'Review Kumasi backhaul', tone: 'teal' as const, onClick: () => navigate('/exchange') },
        { icon: MessageSquare, label: 'Send Melcom nudge', tone: 'ghost' as const, onClick: () => resolve('sv-q', 'Nudge sent to Melcom') },
      ]
    : [
        ...(pending.some((a) => a.id === 'ap-bond')
          ? [{ icon: FileWarning, label: 'Approve bond renewal — $180', tone: 'ember' as const, onClick: () => approveAction('ap-bond') }]
          : []),
        { icon: ArrowLeftRight, label: 'Review 2 backhaul matches', tone: 'teal' as const, onClick: () => navigate('/exchange') },
        { icon: MessageSquare, label: 'Send nudge to Bidco', tone: 'ghost' as const, onClick: () => resolve('at-nudge', 'Nudge sent to Bidco · tracking pixel armed') },
        { icon: Bell, label: 'View all in Autonomy →', tone: 'ghost' as const, onClick: () => navigate('/actions') },
      ];

  // ---- pulse stats ----
  const usd = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const ghs = (v: number) => `GH₵${Math.round(v).toLocaleString()}`;
  const stats: Stat[] = useMemo(() => {
    if (isSavannah) {
      return [
        { label: 'Margin this week', value: 18240, format: ghs, delta: { label: '+6%', tone: 'ok' }, to: '/movements', spark: [0.3, 0.45, 0.4, 0.7, 0.9] },
        { label: 'Cash in transit', value: 9800, format: ghs, delta: { label: 'advances GH₵1,800', tone: 'teal' }, to: '/movements', spark: [0.5, 0.4, 0.6, 0.55, 0.8] },
        { label: 'On-time (30d)', value: 96.1, format: (v) => `${v.toFixed(1)}%`, factId: 'f-customer-melcom', spark: [0.7, 0.75, 0.8, 0.85, 0.95] },
        { label: 'Active exceptions', value: 0, format: (v) => `${Math.round(v)}`, delta: { label: 'calm', tone: 'ok' }, spark: [0.2, 0.1, 0.1, 0, 0] },
      ];
    }
    const exceptions = movements.filter((m) => m.exceptionNote && m.status !== 'Draft').length;
    if (role === 'Dispatcher') {
      return [
        { label: 'Unassigned', value: movements.filter((m) => m.status === 'Booked' && !m.vehiclePlate).length, format: (v) => `${Math.round(v)}`, delta: { label: 'pickup 26h', tone: 'warn' }, to: '/dispatch', spark: [0.8, 0.6, 0.5, 0.4, 0.3] },
        { label: 'Border wait now', value: 5.5, format: (v) => `${v.toFixed(1)}h`, delta: { label: 'trending down', tone: 'ok' }, to: '/movements', spark: [0.9, 0.8, 0.7, 0.6, 0.45] },
        { label: 'On-time (30d)', value: 94.2, format: (v) => `${v.toFixed(1)}%`, spark: [0.6, 0.7, 0.72, 0.8, 0.9] },
        { label: 'Active exceptions', value: exceptions, format: (v) => `${Math.round(v)}`, delta: { label: 'bond 36h', tone: 'danger' }, to: '/actions', spark: [0.2, 0.3, 0.5, 0.5, 0.6] },
      ];
    }
    if (role === 'Finance') {
      return [
        { label: 'Receivables aging >30d', value: 3120, format: usd, delta: { label: '2 invoices', tone: 'warn' }, to: '/movements', spark: [0.4, 0.5, 0.45, 0.6, 0.55] },
        { label: 'Settlements pending', value: 3, format: (v) => `${Math.round(v)}`, delta: { label: '$1,850 next', tone: 'teal' }, to: '/movements', spark: [0.3, 0.4, 0.35, 0.5, 0.45] },
        { label: 'Cash in transit', value: 9240, format: usd, delta: { label: 'advances out $480', tone: 'teal' }, spark: [0.5, 0.55, 0.6, 0.5, 0.7] },
        { label: 'Margin this week', value: 12480, format: usd, delta: { label: '+8%', tone: 'ok' }, spark: [0.3, 0.5, 0.45, 0.7, 0.9] },
      ];
    }
    return [
      { label: 'Margin this week', value: 12480, format: usd, delta: { label: '+8%', tone: 'ok' }, to: '/movements', spark: [0.3, 0.5, 0.45, 0.7, 0.9] },
      { label: 'Cash in transit', value: 9240, format: usd, delta: { label: 'advances out $480', tone: 'teal' }, to: '/movements', spark: [0.5, 0.55, 0.6, 0.5, 0.7] },
      { label: 'On-time (30d)', value: 94.2, format: (v) => `${v.toFixed(1)}%`, factId: undefined, spark: [0.6, 0.7, 0.72, 0.8, 0.9] },
      { label: 'Active exceptions', value: exceptions, format: (v) => `${Math.round(v)}`, delta: { label: exceptions > 0 ? 'bond 36h' : 'calm', tone: exceptions > 0 ? 'danger' : 'ok' }, to: '/actions', spark: [0.2, 0.3, 0.5, 0.5, 0.6] },
    ];
  }, [isSavannah, role, movements]);

  // ---- map ----
  const routes: MapRoute[] = isSavannah
    ? [
        { id: 'sv-104', points: [[560, 700], [492, 585], [430, 480]], tone: 'ember', movementId: 'SV-104', pulses: 2 },
        { id: 'sv-106', points: [[505, 695], [430, 480], [508, 236], [490, 130]], tone: 'planned', movementId: 'SV-106', pulses: 0 },
      ]
    : [
        { id: 'mr-2481', points: [[850, 540], [650, 430], [575, 385], [500, 410], [445, 465], [415, 520]], tone: 'ember', movementId: 'MR-2481', pulses: 3 },
        { id: 'mr-2479', points: [[650, 430], [578, 435], [500, 410]], tone: 'teal', movementId: 'MR-2479', pulses: 1 },
        { id: 'mr-2483', points: [[500, 410], [578, 435], [650, 430]], tone: 'planned', movementId: 'MR-2483', pulses: 0 },
      ];

  const borderNodes: MapBorderNode[] = isSavannah
    ? []
    : [
        { name: 'Malaba', coords: [575, 385], tone: 'warn', label: '5.5h', pulsing: true },
        { name: 'Busia', coords: [578, 435], tone: 'teal', label: '3.1h' },
        { name: 'Gatuna', coords: [445, 465], tone: 'ok' },
      ];

  const liveCount = movements.filter((m) => ['In Transit', 'At Border', 'Booked'].includes(m.status)).length;
  const bordersInPlay = movements.reduce((n, m) => n + m.borders.filter((b) => b.status !== 'cleared').length, 0);
  const todaysMovements = movements.filter((m) => m.status !== 'Settled').slice(0, 4);
  const drawerM = movements.find((m) => m.id === drawerMovement);

  const section = (i: number, children: React.ReactNode, extraDelay = 0, className?: string) => (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.09 + extraDelay, duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );

  const isDispatcher = role === 'Dispatcher';
  const isFinance = role === 'Finance';

  return (
    <div className="space-y-6">
      {/* Section 1 — Header */}
      {section(0, (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-h1 text-text-1">
              {`${greeting}, ${ownerFirst}`.split(' ').map((w, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.012 + 0.05, duration: 0.3, ease: EASE }}
                >
                  {w}&nbsp;
                </motion.span>
              ))}
            </h1>
            <p className="mt-1 text-body text-text-2">
              Tuesday, 14 May · {tenant.name} · {tenant.branch}
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { label: `${liveCount} movements active`, f: 'movements' },
              ...(isSavannah ? [] : [{ label: `${bordersInPlay} borders in play`, f: 'borders' }]),
              { label: `${pending.length} approvals waiting`, f: 'approvals' },
            ].map((chip, i) => (
              <motion.button
                key={chip.label}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.06, type: 'spring', stiffness: 380, damping: 30 }}
                onClick={() => setFilter(filter === chip.f ? null : chip.f)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-caption transition-colors',
                  filter === chip.f ? 'border-teal bg-teal-dim text-teal' : 'border-line-hairline text-text-2 hover:border-line-strong',
                )}
              >
                {chip.label}
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      {/* Section 2 — Brief Card */}
      {section(1, (
        <BriefCard
          tokens={briefTokens}
          actions={briefActions}
          calm={pending.length === 0 && !isSavannah}
          calmText={`Nothing needs you. Watching ${liveCount} movements.`}
        />
      ))}

      {/* Sections 3 + 4 — Attention queue & pulse stats */}
      <div className={cn('grid grid-cols-1 gap-6', !isDispatcher && 'xl:grid-cols-12')}>
        {section(2, (
          <div className="h-full rounded-panel border border-line-hairline bg-surface-1 p-5">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-display text-h2 text-text-1">Needs attention</h2>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-text-2">{visibleItems.length}</span>
              <div className="ml-auto flex rounded-chip border border-line-hairline p-0.5 text-micro uppercase">
                {(['severity', 'time'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSortMode(m)}
                    className={cn('rounded px-2 py-0.5 transition-colors', sortMode === m ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2')}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5" key={`${filter}-${sortMode}`} id="attention-queue">
              <AnimatePresence initial={false}>
                {visibleItems.map((item, i) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3, ease: EASE, layout: { type: 'spring', stiffness: 220, damping: 26 } }}
                    className="flex items-center gap-3 overflow-hidden rounded-card border border-line-hairline bg-surface-2/50 px-3 py-2.5"
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SEV_DOT[item.severity], ['danger', 'warn'].includes(item.severity) && 'animate-pulse-dot')} />
                    <span className="w-20 shrink-0 font-mono text-data text-text-2">{item.mono}</span>
                    <span className="min-w-0 flex-1 truncate text-small text-text-1">{item.text}</span>
                    {item.factId && <MemoryChip factId={item.factId} className="hidden xl:inline-flex" />}
                    <span className="shrink-0 font-mono text-data text-text-3">{item.countdown}</span>
                    <button
                      onClick={() => runItem(item)}
                      className={cn(
                        'shrink-0 rounded-chip px-2.5 py-1 text-caption font-medium transition-colors',
                        item.primary || isDispatcher
                          ? 'bg-ember text-canvas hover:bg-ember-hi'
                          : 'border border-line-strong text-text-2 hover:text-text-1',
                      )}
                    >
                      {item.actionLabel}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {visibleItems.length === 0 && (
                <div className="py-8 text-center text-small text-text-3">Queue clear — the OS is watching.</div>
              )}
            </div>
          </div>
        ), 0, !isDispatcher ? 'xl:col-span-7' : undefined)}

        {section(3, isDispatcher ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s, i) => <StatTile key={s.label} stat={s} index={i} />)}
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 gap-3 xl:grid-cols-1 2xl:grid-cols-2">
            {stats.map((s, i) => <StatTile key={s.label} stat={s} index={i} />)}
          </div>
        ), 0, !isDispatcher ? 'xl:col-span-5' : undefined)}
      </div>

      {/* Sections 5 + 6 — Live ops map & today's movements */}
      <div className={cn('grid grid-cols-1 gap-6', !isFinance && 'xl:grid-cols-12')}>
        {section(4, (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-h2 text-text-1">Live operations</h2>
              <div className="ml-auto flex gap-1.5">
                {(['routes', 'vehicles', 'borders', 'weather'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayers((s) => ({ ...s, [l]: !s[l] }))}
                    className={cn(
                      'rounded-chip border px-2 py-0.5 text-micro uppercase transition-colors',
                      layers[l] ? 'border-teal/40 bg-teal-dim text-teal' : 'border-line-hairline text-text-3 hover:text-text-2',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <LiveMap
              mapAsset={tenant.mapAsset}
              routes={layers.routes ? routes : []}
              vehicles={layers.vehicles ? fleet : []}
              borders={layers.borders ? borderNodes : []}
              height={isFinance ? 120 : 420}
              weather={layers.weather && !isSavannah ? { coords: [600, 400], radius: 110, caption: 'Rain near Busia — expect +2h after 15:00' } : undefined}
              onRouteClick={(r) => r.movementId && setDrawerMovement(r.movementId)}
            />
          </div>
        ), 0.2, !isFinance ? 'xl:col-span-7' : undefined)}

        {section(5, (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-h2 text-text-1">Today’s movements</h2>
              <button onClick={() => navigate('/movements')} className="flex items-center gap-1 text-caption text-teal hover:text-text-1">
                view all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-3">
              {todaysMovements.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.07, duration: 0.4, ease: EASE }}
                >
                  <MovementCard movement={m} />
                </motion.div>
              ))}
            </div>
          </div>
        ), 0, !isFinance ? 'xl:col-span-5' : undefined)}
      </div>

      {/* movement drawer (map route click) */}
      <AnimatePresence>
        {drawerM && (
          <motion.aside
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="glass fixed bottom-0 right-0 top-14 z-50 w-[340px] border-l border-line-strong p-5 shadow-modal"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-data text-text-2">{drawerM.id}</span>
              <button onClick={() => setDrawerMovement(null)} className="rounded p-1 text-text-3 hover:text-text-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 font-display text-h2 text-text-1">
              {drawerM.from} <span className="text-text-3">→</span> {drawerM.to}
            </div>
            <div className="mt-3"><StatusPill status={drawerM.status} /></div>
            <div className="mt-4 space-y-2 text-small text-text-2">
              <div className="flex justify-between"><span className="text-text-3">Customer</span><span className="text-text-1">{drawerM.customer}</span></div>
              <div className="flex justify-between"><span className="text-text-3">Cargo</span><span className="text-text-1">{drawerM.cargo}</span></div>
              <div className="flex justify-between"><span className="text-text-3">Next</span><span className="font-mono text-data text-text-1">{drawerM.nextMilestone ?? '—'}</span></div>
              {drawerM.margin && (
                <div className="flex justify-between"><span className="text-text-3">Margin</span><span className="font-mono text-data text-ok">{fmtMoney(drawerM.margin)}</span></div>
              )}
            </div>
            <button
              onClick={() => navigate(`/movements/${drawerM.id}`)}
              className="mt-6 w-full rounded-chip bg-ember px-4 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
            >
              Open movement
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
