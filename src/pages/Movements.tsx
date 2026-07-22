// /movements — the universal primitive as a list (movements.md PART A).
// Filter/sort DataTable (or card list), status pills, jurisdiction chips, margin,
// next-milestone countdowns, ◈ insight column — tenant-aware (Meridian 4, Savannah 2).
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown, Copy, Download, LayoutGrid, MessageSquare, Plus, ShieldAlert, Table2,
} from 'lucide-react';
import { useStore, useActiveTenant, useTenantMovements, fmtMoney } from '@/store';
import type { Movement, MovementStatus } from '@/store';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import StatusPill from '@/components/StatusPill';
import MovementCard from '@/components/MovementCard';
import EmptyState from '@/components/EmptyState';
import NewMovementModal from '@/components/movements/NewMovementModal';
import { docProgress } from '@/components/movements/geo';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const STATUS_ORDER: MovementStatus[] = [
  'Draft', 'Quoted', 'Booked', 'In Transit', 'At Border', 'Exception', 'Delivered', 'Settled',
];

/** Conductor insight on a row (◈ column). */
function insightFor(m: Movement): string | null {
  if (m.id === 'MR-2481') return 'Bond expires 36h — renewal drafted';
  if (m.id === 'MR-2483') return 'Unassigned — KDL 117C fits the Thursday window';
  if (m.id === 'MR-2485') return 'Emerging corridor — only 2 moves on record (41%)';
  if (m.id === 'SV-106') return 'First cross-border in a while — Paga dossier pre-assembled';
  if (m.exceptionNote) return m.exceptionNote;
  return null;
}

// ---------- ◈ insight dot with glass popover ----------

function InsightDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className="cursor-default font-mono text-data text-teal">◈</span>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="glass absolute right-0 top-full z-50 mt-1.5 block w-56 rounded-card border border-line-strong p-3 text-left text-caption text-text-1 shadow-modal"
          >
            <span className="mb-1 block text-micro uppercase text-teal">Conductor insight</span>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ---------- row context menu ----------

function RowMenu({ movement }: { movement: Movement }) {
  const [open, setOpen] = useState(false);
  const pushToast = useStore((s) => s.pushToast);
  const act = (title: string, body?: string) => {
    pushToast({ title, body: body ?? movement.id, tone: 'teal' });
    setOpen(false);
  };
  return (
    <span className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 text-text-3 transition-colors hover:text-text-1"
        aria-label="Row actions"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="glass absolute right-0 top-full z-50 mt-1 block w-52 rounded-card border border-line-strong p-1.5 shadow-modal"
          >
            {[
              { icon: MessageSquare, label: 'Message driver', run: () => act(`Message drafted to ${movement.driverName ?? 'driver'}`) },
              { icon: ShieldAlert, label: 'Add exception', run: () => act('Exception noted', 'Conductor is recalculating ETA') },
              { icon: Copy, label: 'Duplicate as quote', run: () => act('Draft quote duplicated', `${movement.from} → ${movement.to}`) },
              { icon: Download, label: 'Export docs pack', run: () => act('Docs pack exported', `${docProgress(movement).join('/')} documents · PDF`) },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.run}
                className="flex w-full items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-small text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ---------- dropdown (corridor / customer) ----------

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-chip border border-line-hairline bg-surface-1 px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:border-line-strong hover:text-text-1"
      >
        <span className="text-text-3">{label}</span>
        {value === 'all' ? 'All' : value}
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="glass absolute left-0 top-full z-50 mt-1 block max-h-56 w-56 overflow-y-auto rounded-card border border-line-strong p-1.5 shadow-modal"
          >
            {['all', ...options].map((o) => (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false); }}
                className={cn(
                  'block w-full rounded-chip px-2.5 py-1.5 text-left text-small transition-colors',
                  value === o ? 'bg-surface-3 text-text-1' : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                )}
              >
                {o === 'all' ? `All ${label.toLowerCase()}` : o}
              </button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ---------- page ----------

export default function Movements() {
  const navigate = useNavigate();
  const tenant = useActiveTenant();
  const movements = useTenantMovements();
  const role = useStore((s) => s.role);
  const setCommandBarOpen = useStore((s) => s.setCommandBarOpen);

  // Dispatcher defaults to "needs action": Booked + At Border + Exception
  const [statuses, setStatuses] = useState<MovementStatus[]>(() =>
    role === 'Dispatcher' ? ['Booked', 'At Border', 'Exception'] : [],
  );
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [corridor, setCorridor] = useState('all');
  const [customer, setCustomer] = useState('all');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [newOpen, setNewOpen] = useState(false);

  const counts = useMemo(() => {
    const c = new Map<MovementStatus, number>();
    movements.forEach((m) => c.set(m.status, (c.get(m.status) ?? 0) + 1));
    return c;
  }, [movements]);
  const exceptionCount = movements.filter((m) => m.exceptionNote).length;
  const presentStatuses = STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0);

  const corridors = useMemo(
    () => [...new Set(movements.map((m) => `${m.from}–${m.to}`))],
    [movements],
  );
  const customers = useMemo(() => [...new Set(movements.map((m) => m.customer))], [movements]);

  const filtered = movements.filter((m) => {
    const statusOk =
      (statuses.length === 0 && !exceptionsOnly) ||
      statuses.includes(m.status) ||
      (exceptionsOnly && !!m.exceptionNote);
    const corridorOk = corridor === 'all' || `${m.from}–${m.to}` === corridor;
    const customerOk = customer === 'all' || m.customer === customer;
    return statusOk && corridorOk && customerOk;
  });

  const filterKey = JSON.stringify([statuses, exceptionsOnly, corridor, customer, tenant.id, view]);

  const toggleStatus = (s: MovementStatus) =>
    setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const columns: Column<Movement>[] = [
    {
      key: 'id', label: 'ID', mono: true, sortable: true, sortValue: (m) => m.id,
      render: (m) => <span className="font-mono text-data text-text-2">{m.id}</span>,
    },
    {
      key: 'route', label: 'Route', sortable: true, sortValue: (m) => `${m.from}${m.to}`,
      render: (m) => (
        <span className="flex items-center gap-1.5">
          <span className="font-display text-small font-semibold text-text-1">
            {m.from} <span className="text-text-3">→</span> {m.to}
          </span>
          {m.flags.length > 1 && m.flags.map((f) => (
            <span key={f} className="rounded border border-line-hairline px-1 py-px font-mono text-[9px] text-text-3">{f}</span>
          ))}
        </span>
      ),
    },
    { key: 'customer', label: 'Customer', render: (m) => <span className="text-text-2">{m.customer}</span> },
    { key: 'status', label: 'Status', sortable: true, sortValue: (m) => STATUS_ORDER.indexOf(m.status), render: (m) => <StatusPill status={m.status} /> },
    {
      key: 'next', label: 'Next milestone', mono: true, sortable: true, sortValue: (m) => m.nextMilestoneInH ?? 9999,
      render: (m) => (
        <span className="font-mono text-data text-text-2">
          {m.nextMilestone ?? '—'}
          {m.nextMilestoneInH !== undefined && <span className="text-text-3"> · {m.nextMilestoneInH}h</span>}
        </span>
      ),
    },
    {
      key: 'docs', label: 'Docs', mono: true,
      render: (m) => {
        const [done, total] = docProgress(m);
        return (
          <span className={cn('font-mono text-data', done === total ? 'text-ok' : done / Math.max(total, 1) >= 0.7 ? 'text-warn' : 'text-danger')}>
            {done}/{total}
          </span>
        );
      },
    },
    {
      key: 'margin', label: 'Margin', mono: true, align: 'right', sortable: true, sortValue: (m) => m.margin?.amount ?? -Infinity,
      render: (m) =>
        m.margin ? (
          <span className={cn('font-mono text-data', m.margin.amount < 0 ? 'text-danger' : 'text-ok')}>{fmtMoney(m.margin)}</span>
        ) : (
          <span className="font-mono text-data text-text-3">—</span>
        ),
    },
    {
      key: 'memory', label: '◈',
      render: (m) => {
        const insight = insightFor(m);
        return insight ? <InsightDot text={insight} /> : <span className="text-text-3">·</span>;
      },
    },
    { key: 'menu', label: '', render: (m) => <RowMenu movement={m} /> },
  ];

  return (
    <div>
      {/* A1 — header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-text-1">Movements</h1>
          <p className="mt-1 text-small text-text-2">
            Every job is a movement — local drop or three-border corridor. Same object.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandBarOpen(true)}
            className="hidden text-caption text-text-3 transition-colors hover:text-teal md:block"
          >
            say <kbd className="rounded border border-line-hairline px-1 font-mono text-[10px]">quote …</kbd> in ⌘K
          </button>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 rounded-chip bg-ember px-3.5 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
          >
            <Plus className="h-4 w-4" /> New movement
          </button>
        </div>
      </div>

      {/* A1 — filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip
          active={statuses.length === 0 && !exceptionsOnly}
          onClick={() => { setStatuses([]); setExceptionsOnly(false); }}
          label="All"
          count={movements.length}
          index={0}
        />
        {presentStatuses.map((s, i) => (
          <FilterChip
            key={s}
            active={statuses.includes(s)}
            onClick={() => toggleStatus(s)}
            label={s}
            count={counts.get(s) ?? 0}
            index={i + 1}
          />
        ))}
        {exceptionCount > 0 && (
          <FilterChip
            active={exceptionsOnly}
            onClick={() => setExceptionsOnly((v) => !v)}
            label="Exceptions"
            count={exceptionCount}
            index={presentStatuses.length + 1}
            danger
          />
        )}

        <span className="mx-1 hidden h-4 w-px bg-line-hairline sm:block" />
        <FilterDropdown label="Corridor" value={corridor} options={corridors} onChange={setCorridor} />
        <FilterDropdown label="Customer" value={customer} options={customers} onChange={setCustomer} />

        {/* view toggle */}
        <span className="ml-auto flex items-center rounded-chip border border-line-hairline bg-surface-1 p-0.5">
          {(['table', 'cards'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'relative flex items-center gap-1 rounded-[5px] px-2.5 py-1 text-caption capitalize transition-colors',
                view === v ? 'text-text-1' : 'text-text-3 hover:text-text-2',
              )}
            >
              {view === v && (
                <motion.span
                  layoutId="view-toggle-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-[5px] bg-surface-3"
                />
              )}
              <span className="relative flex items-center gap-1">
                {v === 'table' ? <Table2 className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}
                {v === 'table' ? 'Table' : 'Cards'}
              </span>
            </button>
          ))}
        </span>
      </div>

      {/* A2 — table / cards */}
      {filtered.length > 0 ? (
        view === 'table' ? (
          <DataTable
            key={filterKey}
            columns={columns}
            rows={filtered}
            rowKey={(m) => m.id}
            onRowClick={(m) => navigate(`/movements/${m.id}`)}
          />
        ) : (
          <div key={filterKey} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.24, ease: EASE }}
              >
                <MovementCard movement={m} />
              </motion.div>
            ))}
          </div>
        )
      ) : (
        /* A3 — empty / filtered state */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <EmptyState
            title="Nothing here"
            body={`Nothing here — say \`quote 12t ${tenant.id === 'savannah' ? 'accra to kumasi friday' : 'nairobi to kampala tuesday'}\` in ⌘K and I'll draft the first one.`}
            actionLabel="Open ⌘K"
            onAction={() => setCommandBarOpen(true)}
          />
        </motion.div>
      )}

      <NewMovementModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(m) => navigate(`/movements/${m.id}`)}
      />
    </div>
  );
}

// ---------- status filter chip (stagger 40ms, ember underline) ----------

function FilterChip({
  active,
  onClick,
  label,
  count,
  index,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  index: number;
  danger?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.24, ease: EASE }}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 rounded-chip border px-2.5 py-1.5 text-caption transition-colors duration-150',
        active
          ? danger
            ? 'border-danger/40 bg-danger/10 text-danger'
            : 'border-ember/40 bg-ember-dim text-ember'
          : 'border-line-hairline bg-surface-1 text-text-3 hover:border-line-strong hover:text-text-2',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 font-mono text-[10px]',
          active ? (danger ? 'bg-danger text-canvas' : 'bg-ember text-canvas') : 'bg-surface-3 text-text-2',
        )}
      >
        {count}
      </span>
      {/* active underline — slides in (spring-snappy) */}
      {active && (
        <motion.span
          layoutId={danger ? 'exception-chip-underline' : 'status-chip-underline'}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full', danger ? 'bg-danger' : 'bg-ember')}
        />
      )}
    </motion.button>
  );
}
