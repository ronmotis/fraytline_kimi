import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Route as RouteIcon, FileText, Truck, ArrowLeftRight,
  Brain, ShieldCheck, Building2, Settings, Bell, ChevronLeft, ChevronRight,
  Sparkles, X,
} from 'lucide-react';
import {
  useStore, useActiveTenant, usePendingApprovals, useTenantMovements, useTenantDock,
} from '@/store';
import TenantSwitcher from './TenantSwitcher';
import RoleSwitcher from './RoleSwitcher';
import CommandBar from './CommandBar';
import Toasts from './Toast';
import MemoryChip from './MemoryChip';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

// ---------- Top Bar (56px) ----------

function TopBar() {
  const tenant = useActiveTenant();
  const setCommandBarOpen = useStore((s) => s.setCommandBarOpen);
  const pending = usePendingApprovals();
  const openLoads = useStore((s) => s.exchangeLoads.filter((l) => l.status === 'open').length);
  const owner = useStore((s) => s.people.find((p) => p.tenantId === s.activeTenantId && p.role === 'Owner'));
  const navigate = useNavigate();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-4 border-b border-line-hairline bg-surface-1 px-4">
      <img src="/logo.svg" alt="Fraytline" className="h-6 w-auto shrink-0" />
      <button className="hidden items-center gap-1.5 text-caption text-text-2 transition-colors hover:text-text-1 lg:flex">
        {tenant.name} · {tenant.branch}
        <span className="text-text-3">▾</span>
      </button>
      <TenantSwitcher />

      <div className="flex flex-1 justify-center">
        <button
          onClick={() => setCommandBarOpen(true)}
          className="hidden w-[480px] max-w-full items-center justify-between rounded-full border border-line-hairline bg-surface-2 px-4 py-1.5 text-small text-text-3 transition-colors hover:border-line-strong md:flex"
        >
          <span>Ask or act…</span>
          <kbd className="rounded border border-line-hairline px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
      </div>

      <button
        onClick={() => navigate('/exchange')}
        className="relative flex items-center gap-1.5 rounded-chip px-2 py-1.5 text-caption text-text-2 transition-colors hover:text-text-1"
        title="Exchange"
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', openLoads > 0 ? 'bg-teal animate-pulse-dot' : 'bg-text-3')} />
        <span className="hidden xl:inline">Exchange</span>
        {openLoads > 0 && <span className="font-mono text-[10px] text-teal">{openLoads}</span>}
      </button>

      <button
        onClick={() => navigate('/actions')}
        className="relative rounded-chip p-2 text-text-2 transition-colors hover:text-text-1"
        title="Approvals"
      >
        <Bell className="h-4 w-4" />
        {pending.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 font-mono text-[9px] font-semibold text-canvas">
            {pending.length}
          </span>
        )}
      </button>

      <RoleSwitcher />
      <img
        src={owner?.avatar ?? '/avatar-wanjiru.png'}
        alt={owner?.name ?? 'Operator'}
        className="h-7 w-7 rounded-full border border-line-strong object-cover"
      />
    </header>
  );
}

// ---------- Left Rail (64 → 232px on hover) ----------

function LeftRail() {
  const location = useLocation();
  const movements = useTenantMovements();
  const quotes = useStore((s) => s.quotes.filter((q) => q.tenantId === s.activeTenantId));
  const facts = useStore((s) => s.memoryFacts.filter((f) => f.tenantId === s.activeTenantId));
  const pending = usePendingApprovals();
  const openLoads = useStore((s) => s.exchangeLoads.filter((l) => l.status === 'open').length);

  const inTransit = movements.filter((m) => m.status === 'In Transit' || m.status === 'At Border').length;
  const unassigned = movements.filter((m) => m.status === 'Booked' && !m.vehiclePlate).length;
  const exceptions = movements.filter((m) => m.exceptionNote && m.status !== 'Draft').length;
  const awaitingQuote = quotes.filter((q) => q.status === 'sent' || q.status === 'opened').length;
  const unreviewed = facts.filter((f) => f.status === 'unreviewed').length;
  const attention = pending.length + unassigned + exceptions;

  const items: { to: string; label: string; icon: typeof LayoutDashboard; badge?: number; badgeTone?: 'danger' | 'ember'; tealDot?: boolean }[] = [
    { to: '/today', label: 'Today', icon: LayoutDashboard, badge: attention || undefined, badgeTone: exceptions ? 'danger' : undefined },
    { to: '/movements', label: 'Movements', icon: RouteIcon, badge: inTransit || undefined },
    { to: '/quotes', label: 'Quotes', icon: FileText, badge: awaitingQuote || undefined },
    { to: '/dispatch', label: 'Dispatch', icon: Truck, badge: unassigned || undefined, badgeTone: 'ember' },
    { to: '/exchange', label: 'Exchange', icon: ArrowLeftRight, tealDot: openLoads > 0 },
    { to: '/memory', label: 'Memory', icon: Brain, tealDot: unreviewed > 0 },
    { to: '/actions', label: 'Autonomy', icon: ShieldCheck, badge: pending.length || undefined, badgeTone: 'ember' },
    { to: '/network', label: 'Network', icon: Building2 },
  ];

  const renderItem = (item: (typeof items)[number]) => {
    const active = location.pathname.startsWith(item.to);
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          'relative flex h-10 items-center gap-3 rounded-card px-3 transition-colors duration-150',
          active ? 'bg-surface-2 text-text-1' : 'text-text-2 hover:bg-surface-2/60 hover:text-text-1',
        )}
      >
        {active && (
          <motion.span
            layoutId="rail-indicator"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-ember"
          />
        )}
        <span className="relative shrink-0">
          <Icon className="h-5 w-5" />
          {item.tealDot && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-teal" />}
        </span>
        <span className="whitespace-nowrap text-small opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
          {item.label}
        </span>
        {item.badge !== undefined && (
          <span
            className={cn(
              'ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold',
              item.badgeTone === 'danger' && 'bg-danger text-canvas',
              item.badgeTone === 'ember' && 'bg-ember text-canvas',
              !item.badgeTone && 'bg-surface-3 text-text-2',
            )}
          >
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <nav className="group/rail fixed bottom-0 left-0 top-14 z-30 flex w-16 flex-col gap-1 overflow-hidden border-r border-line-hairline bg-surface-1 px-2 py-3 transition-all duration-200 ease-out-expo hover:w-[232px]">
      {items.map(renderItem)}
      <div className="mt-auto border-t border-line-hairline pt-2">
        {renderItem({ to: '/settings', label: 'Settings', icon: Settings })}
      </div>
    </nav>
  );
}

// ---------- Conductor Dock (right, 320px, collapsible to 48px tab) ----------

function ConductorDock() {
  const open = useStore((s) => s.dockOpen);
  const setOpen = useStore((s) => s.setDockOpen);
  const messages = useTenantDock();
  const movements = useTenantMovements();
  const approvals = useStore((s) => s.approvals);
  const approveAction = useStore((s) => s.approveAction);
  const confirmFact = useStore((s) => s.confirmFact);
  const resolveDockMessage = useStore((s) => s.resolveDockMessage);
  const [whyOpen, setWhyOpen] = useState<string | null>(null);

  const live = movements.filter((m) => ['In Transit', 'At Border', 'Booked'].includes(m.status)).length;
  const visible = [...messages].sort((a, b) => Number(a.resolved) - Number(b.resolved));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-0 right-0 top-14 z-30 flex w-12 flex-col items-center gap-3 border-l border-teal/25 bg-surface-1 pt-4 transition-colors hover:bg-surface-2"
        title="Open Conductor"
      >
        <Sparkles className="h-4 w-4 text-teal" />
        <span className="text-micro uppercase tracking-widest text-teal" style={{ writingMode: 'vertical-rl' }}>
          Conductor
        </span>
        <ChevronLeft className="mt-auto mb-4 h-4 w-4 text-text-3" />
      </button>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: 320 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="fixed bottom-0 right-0 top-14 z-30 flex w-80 flex-col border-l border-line-hairline bg-surface-1"
    >
      <div className="flex items-center gap-2 border-b border-line-hairline px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-dot" />
        <span className="text-body-strong text-text-1">Conductor</span>
        <span className="text-caption text-text-3">watching {live} movements</span>
        <button onClick={() => setOpen(false)} className="ml-auto rounded p-1 text-text-3 hover:text-text-1" title="Collapse">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {visible.map((m, i) => {
          const action = m.actionId ? approvals.find((a) => a.id === m.actionId) : undefined;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3, ease: EASE }}
              className={cn(
                'rounded-card border p-3',
                m.resolved ? 'border-line-hairline bg-surface-1 opacity-50' : 'border-teal/20 bg-teal-dim/40',
              )}
            >
              <div className="mb-1 text-micro uppercase text-teal">
                {m.kind === 'brief' ? 'Overnight watch' : m.kind === 'suggestion' ? 'Suggestion' : m.kind === 'learning' ? 'Learning' : 'Prediction'}
              </div>
              <p className="text-small text-text-1">{m.text}</p>

              {m.factIds?.map((id) => <MemoryChip key={id} factId={id} className="mt-2" />)}

              {m.kind === 'brief' && m.sources && (
                <div className="mt-2">
                  <button onClick={() => setWhyOpen(whyOpen === m.id ? null : m.id)} className="text-caption text-teal hover:text-text-1">
                    Why am I seeing this?
                  </button>
                  {whyOpen === m.id && (
                    <div className="mt-1.5 space-y-1 rounded-chip border border-line-hairline bg-surface-2 p-2">
                      {m.sources.map((s) => (
                        <div key={s} className="flex items-center gap-1.5 text-caption text-text-2">
                          <span className="h-1 w-1 rounded-full bg-teal" /> {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!m.resolved && action && action.status === 'pending' && (
                <button
                  onClick={() => { approveAction(action.id); resolveDockMessage(m.id); }}
                  className="mt-2 rounded-chip bg-ember px-2.5 py-1 text-caption font-medium text-canvas transition-colors hover:bg-ember-hi"
                >
                  Approve · {action.title.split('—')[0]}
                </button>
              )}
              {!m.resolved && m.kind === 'learning' && m.factIds && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { m.factIds!.forEach((id) => confirmFact(id)); resolveDockMessage(m.id); }}
                    className="rounded-chip border border-teal/40 bg-teal-dim px-2.5 py-1 text-caption font-medium text-teal hover:border-teal"
                  >
                    Make rule
                  </button>
                  <button
                    onClick={() => resolveDockMessage(m.id)}
                    className="rounded-chip border border-line-strong px-2.5 py-1 text-caption text-text-2 hover:text-text-1"
                  >
                    Not now
                  </button>
                </div>
              )}

              <div className="mt-2 text-[10px] text-text-3">logged · reversible</div>
            </motion.div>
          );
        })}
      </div>
    </motion.aside>
  );
}

// ---------- Autonomy Chip (floating bottom-left) ----------

function AutonomyChip() {
  const autonomy = useStore((s) => s.autonomy);
  const pending = usePendingApprovals();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/actions')}
      className={cn(
        'fixed bottom-4 left-20 z-30 flex items-center gap-2 rounded-full border border-line-hairline bg-surface-1 px-3 py-1.5 text-caption shadow-modal transition-colors hover:border-line-strong',
        pending.length > 0 && 'animate-breathe',
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-teal" />
      <span className="text-text-2">Autonomy: <span className="text-text-1">{autonomy.quoting ?? 'Suggest'}</span></span>
      {pending.length > 0 && (
        <span className="text-ember">{pending.length} approval{pending.length === 1 ? '' : 's'} pending</span>
      )}
    </button>
  );
}

// ---------- Role banner ----------

function RoleBanner() {
  const role = useStore((s) => s.role);
  const dismissed = useStore((s) => s.roleBannerDismissed);
  const dismiss = useStore((s) => s.dismissRoleBanner);
  if (role === 'Owner' || dismissed) return null;
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-teal/25 bg-teal-dim px-4 py-1.5 text-caption text-teal">
      <Sparkles className="h-3 w-3" />
      Viewing as {role} — layout & actions adapted
      <button onClick={dismiss} className="ml-auto rounded p-0.5 hover:text-text-1"><X className="h-3 w-3" /></button>
    </div>
  );
}

// ---------- Shell ----------

export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  const setCommandBarOpen = useStore((s) => s.setCommandBarOpen);
  const commandBarOpen = useStore((s) => s.commandBarOpen);
  const dockOpen = useStore((s) => s.dockOpen);
  const activeTenantId = useStore((s) => s.activeTenantId);
  const tick = useStore((s) => s.tick);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandBarOpen, setCommandBarOpen]);

  // proactive event tick
  useEffect(() => {
    const t = setInterval(() => tick(), 45000);
    const first = setTimeout(() => tick(), 30000);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [tick]);

  return (
    <div className="grain min-h-[100dvh] bg-canvas text-text-1">
      <TopBar />
      <LeftRail />
      <ConductorDock />

      <main
        className={cn(
          'fixed bottom-0 left-16 top-14 overflow-y-auto transition-[right] duration-300 ease-out-expo',
          dockOpen ? 'right-12 lg:right-80' : 'right-12',
        )}
      >
        <RoleBanner />
        <div className="mx-auto max-w-[1520px] px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${location.pathname}-${activeTenantId}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AutonomyChip />
      <CommandBar />
      <Toasts />
    </div>
  );
}
