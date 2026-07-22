// Right rail (movements.md §B3) — tabbed: Documents · Money · Parties · Exceptions.
// Tabs render only when their tier has data (Progressive Complexity, design.md §11);
// the page computes which tabs exist. Framer-motion only (no GSAP in this tree).
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Coins, Fuel,
  Landmark, MessageSquare, Percent, Plus, Receipt, Scale,
} from 'lucide-react';
import { useStore, useActiveTenant, fmtMoney } from '@/store';
import type { ApprovalAction, MoneyEvent, Movement, Party } from '@/store';
import DocChip from '@/components/DocChip';
import MemoryChip from '@/components/MemoryChip';
import ApprovalCard from '@/components/ApprovalCard';
import ConfidenceRing from '@/components/ConfidenceRing';
import { corridorCurrencies, FX_RATES } from './geo';
import type { DocDrawerTarget } from './DocDrawer';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING_PANEL = { type: 'spring', stiffness: 220, damping: 26 } as const;

export type RailTab = 'docs' | 'money' | 'parties' | 'exceptions';

const TAB_LABEL: Record<RailTab, string> = {
  docs: 'Documents',
  money: 'Money',
  parties: 'Parties',
  exceptions: 'Exceptions',
};

const KIND_ICON: Record<MoneyEvent['kind'], typeof Coins> = {
  advance: Fuel,
  settlement: Landmark,
  fx: Scale,
  tax: Percent,
  invoice: Receipt,
};

const ROLE_LABEL: Record<Party['role'], string> = {
  shipper: 'Customer',
  consignee: 'Consignee',
  partner: 'Subcontractor',
  carrier: 'Carrier',
  driver: 'Driver',
  notify: 'Notify',
};

export interface LocalException {
  id: string;
  type: string;
  note: string;
}

export default function RailTabs({
  movement,
  tabs,
  defaultTab,
  pendingException,
  portal,
  onOpenDrawer,
  localExceptions = [],
  onRaiseException,
}: {
  movement: Movement;
  tabs: RailTab[];
  defaultTab: RailTab;
  pendingException?: ApprovalAction;
  portal?: boolean;
  onOpenDrawer: (t: DocDrawerTarget) => void;
  localExceptions?: LocalException[];
  onRaiseException?: () => void;
}) {
  const [tab, setTab] = useState<RailTab>(defaultTab);
  // adjust state during render when the role/signal changes the default tab
  const [prevDefault, setPrevDefault] = useState(defaultTab);
  if (prevDefault !== defaultTab) {
    setPrevDefault(defaultTab);
    setTab(defaultTab);
  }
  const active = tabs.includes(tab) ? tab : tabs[0];

  const exceptionCount = (pendingException || movement.exceptionNote ? 1 : 0) > 0 ? 1 : 0;

  return (
    <div className="flex h-full flex-col rounded-panel border border-line-hairline bg-surface-1">
      {/* tab header — micro labels, active teal underline (layoutId) */}
      <div className="flex items-center gap-1 border-b border-line-hairline px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-2.5 pb-2 pt-1.5 text-micro uppercase transition-colors duration-150',
              active === t ? 'text-teal' : 'text-text-3 hover:text-text-2',
            )}
          >
            {TAB_LABEL[t]}
            {t === 'exceptions' && exceptionCount > 0 && (
              <span className="ml-1 rounded-full bg-danger px-1 font-mono text-[9px] text-canvas">{exceptionCount}</span>
            )}
            {active === t && (
              <motion.span
                layoutId="rail-tab-underline"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-x-2 bottom-0 h-px bg-teal"
              />
            )}
          </button>
        ))}
      </div>

      {/* tab content — 200ms fade + y 8 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {active === 'docs' && (
              <DocsTab movement={movement} portal={portal} pendingException={pendingException} onOpenDrawer={onOpenDrawer} />
            )}
            {active === 'money' && <MoneyTab movement={movement} />}
            {active === 'parties' && <PartiesTab movement={movement} portal={portal} />}
            {active === 'exceptions' && (
              <ExceptionsTab
                movement={movement}
                pendingException={pendingException}
                localExceptions={localExceptions}
                onRaiseException={onRaiseException}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- Tab 1 — Documents ----------

function DocsTab({
  movement,
  portal,
  pendingException,
  onOpenDrawer,
}: {
  movement: Movement;
  portal?: boolean;
  pendingException?: ApprovalAction;
  onOpenDrawer: (t: DocDrawerTarget) => void;
}) {
  const [renewOpen, setRenewOpen] = useState(false);
  const docs = portal
    ? movement.docs.filter((d) => /pod|cert|waybill|origin/i.test(d.name))
    : movement.docs;
  const done = docs.filter((d) => d.status === 'verified').length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-caption text-text-2">
        <span>
          {done} of {docs.length} complete — assembled automatically from
        </span>
        <MemoryChip
          label="your document habits on this corridor"
          confidence={90}
          source="behavior"
          evidence={['recurring doc set per corridor', 'agent countersign history']}
          evidenceCount={12}
        />
      </div>

      <div className="space-y-1.5">
        {docs.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.24, ease: EASE }}
            className="flex items-center justify-between gap-2 rounded-card border border-line-hairline bg-surface-2/50 px-2.5 py-1.5"
          >
            <span className={cn(d.status === 'expiring' && 'animate-pulse-dot-slow rounded-chip')}>
              <DocChip doc={d} />
            </span>
            <span className="flex items-center gap-1.5">
              {d.status === 'expiring' && pendingException && !portal && (
                <button
                  onClick={() => setRenewOpen((v) => !v)}
                  className="rounded-chip border border-warn/40 bg-warn/10 px-2 py-0.5 text-caption text-warn transition-colors hover:bg-warn/20"
                >
                  renew
                </button>
              )}
              <button
                onClick={() => onOpenDrawer({ border: movement.borders.find((b) => b.status !== 'cleared') ?? movement.borders[0], docId: d.id })}
                className="rounded p-1 text-text-3 transition-colors hover:text-text-1"
                title="Open in doc drawer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </span>
          </motion.div>
        ))}
        {docs.length === 0 && (
          <div className="rounded-card border border-dashed border-line-strong p-4 text-center text-caption text-text-3">
            No documents visible in this view.
          </div>
        )}
      </div>

      <AnimatePresence>
        {renewOpen && pendingException && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_PANEL}
            className="mt-3 overflow-hidden"
          >
            <ApprovalCard action={pendingException} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Tab 2 — Money (L3) ----------

function MoneyTab({ movement }: { movement: Movement }) {
  const checkPolicy = useStore((s) => s.checkPolicy);
  const pushToast = useStore((s) => s.pushToast);
  const customers = useStore((s) => s.customers);
  const laneFact = useStore((s) =>
    s.memoryFacts.find(
      (f) =>
        f.tenantId === s.activeTenantId &&
        f.kind === 'lane' &&
        f.status !== 'archived' &&
        f.label.toLowerCase().includes(`${movement.from}→${movement.to}`.toLowerCase()),
    ),
  );
  const [paid, setPaid] = useState<Record<string, boolean>>({});

  const customer = customers.find((c) => c.name === movement.customer);
  const currencies = corridorCurrencies(movement);
  const costAmt = movement.cost?.amount ?? 0;
  const marginAmt = movement.margin?.amount ?? movement.price.amount - costAmt;
  const priceAmt = movement.price.amount;

  const approveAdvance = (ev: MoneyEvent) => {
    const usd = ev.value.currency === 'USD' ? ev.value.amount : Math.round(ev.value.amount / 130);
    const check = checkPolicy({ kind: 'expense', amountUsd: usd });
    if (check.verdict === 'auto') {
      setPaid((p) => ({ ...p, [ev.id]: true }));
      pushToast({ title: `${ev.label} approved`, body: `auto · ${check.reason}`, tone: 'ok', ledgerLink: true });
    } else {
      pushToast({ title: 'Escalated for approval', body: check.reason, tone: 'ember' });
    }
  };

  return (
    <div className="space-y-4">
      {/* quote value */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-micro uppercase text-text-3">Quote value</div>
          <div className="mt-0.5 font-mono text-data-lg text-text-1">{fmtMoney(movement.price)}</div>
        </div>
        {laneFact ? (
          <MemoryChip factId={laneFact.id} />
        ) : movement.id === 'MR-2481' ? (
          <MemoryChip
            label="corridor avg $4,100 · +2.4%"
            confidence={83}
            source="document"
            evidence={['corridor history · Mombasa→Kigali']}
            evidenceCount={9}
          />
        ) : null}
      </div>

      {/* money events timeline */}
      <div className="space-y-1.5">
        {movement.moneyEvents.map((ev, i) => {
          const Icon = KIND_ICON[ev.kind];
          const isPaid = paid[ev.id] || ev.status === 'done';
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.24, ease: EASE }}
              className="flex items-center gap-2.5 rounded-card border border-line-hairline bg-surface-2/50 px-2.5 py-2"
            >
              <Icon className={cn('h-3.5 w-3.5 shrink-0', isPaid ? 'text-ok' : 'text-warn')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-text-1">{ev.label}</span>
                <span className="text-caption text-text-3">{ev.kind}</span>
              </span>
              <span className="font-mono text-data text-text-1">{fmtMoney(ev.value)}</span>
              {isPaid ? (
                <span className="rounded-chip border border-ok/30 bg-ok/10 px-1.5 py-px font-mono text-[10px] uppercase text-ok">paid</span>
              ) : ev.kind === 'advance' ? (
                <button
                  onClick={() => approveAdvance(ev)}
                  className="rounded-chip bg-ember px-2 py-0.5 font-mono text-[10px] uppercase text-canvas transition-colors hover:bg-ember-hi"
                >
                  approve
                </button>
              ) : (
                <span className="rounded-chip border border-warn/30 bg-warn/10 px-1.5 py-px font-mono text-[10px] uppercase text-warn">pending</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* settlement projection */}
      {customer?.paymentDays && (
        <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-2">
          <span>
            Settlement · customer net-{customer.paymentDays}
          </span>
          {movement.customer.includes('Bidco') ? (
            <MemoryChip
              label="Bidco pays in 26 days avg → projected 12 Jun"
              confidence={88}
              source="behavior"
              evidence={['invoice history · Bidco Africa']}
              evidenceCount={17}
            />
          ) : (
            <MemoryChip
              label={`${customer.name} · ${customer.paymentDays}d terms`}
              confidence={80}
              source="behavior"
              evidence={['invoice history']}
              evidenceCount={6}
            />
          )}
        </div>
      )}

      {/* margin live + breakdown bars */}
      {movement.cost && (
        <div className="rounded-card border border-line-hairline bg-surface-2/50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-micro uppercase text-text-3">Margin · live</span>
            <span className={cn('font-mono text-data-lg', marginAmt < 0 ? 'text-danger' : 'text-ok')}>
              {fmtMoney({ amount: marginAmt, currency: movement.price.currency })}
            </span>
          </div>
          {/* stacked horizontal breakdown — draws 500ms on tab enter */}
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(costAmt / priceAmt) * 100}%` }}
              transition={{ duration: 0.5, ease: EASE }}
              className="h-full bg-text-3/60"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(Math.max(marginAmt, 0) / priceAmt) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
              className={cn('h-full', marginAmt < 0 ? 'bg-danger' : 'bg-ember')}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-text-3">
            <span>cost {fmtMoney(movement.cost)}</span>
            <span>margin {Math.round((marginAmt / priceAmt) * 100)}%</span>
          </div>
        </div>
      )}

      {/* currency chips + FX micro-rates */}
      {currencies.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {currencies.map((c) => (
            <span
              key={c}
              className="rounded-chip border border-line-hairline bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-2"
            >
              {c} <span className="text-text-3">{FX_RATES[c]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Tab 3 — Parties (L4) ----------

function PartiesTab({ movement, portal }: { movement: Movement; portal?: boolean }) {
  const people = useStore((s) => s.people);
  const tenant = useActiveTenant();
  const pushToast = useStore((s) => s.pushToast);
  const partnerFact = useStore((s) =>
    s.memoryFacts.find((f) => f.kind === 'partner' && f.tenantId === s.activeTenantId && f.status !== 'archived'),
  );

  const avatarFor = (p: Party) =>
    people.find((person) => p.name.includes(person.name) || p.detail?.includes(person.name))?.avatar;

  const displayName = (p: Party) =>
    portal && (p.role === 'partner' || p.role === 'carrier') ? `${tenant.name} network` : p.name;

  const hasPartnerLeg = movement.legs.some((l) => l.partnerName);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {movement.parties.map((p, i) => {
          const avatar = avatarFor(p);
          const isPartner = p.role === 'partner';
          return (
            <motion.div
              key={`${p.name}-${p.role}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}
              className="flex items-center gap-3 rounded-card border border-line-hairline bg-surface-2/50 p-3"
            >
              {avatar ? (
                <img src={avatar} alt={p.name} className="h-9 w-9 rounded-full border border-line-strong object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface-3 font-display text-small text-text-2">
                  {displayName(p).slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-text-1">{displayName(p)}</span>
                <span className="block truncate text-caption text-text-3">
                  {ROLE_LABEL[p.role]}
                  {p.detail && !portal ? ` · ${p.detail}` : ''}
                </span>
              </span>
              {isPartner && partnerFact && !portal && (
                <ConfidenceRing value={Number(partnerFact.value) || partnerFact.confidence} size={28} showLabel />
              )}
              {!portal && (
                <button
                  onClick={() => pushToast({ title: `Message drafted to ${p.name}`, body: 'Conductor will send inside the 07:00–21:00 window', tone: 'teal' })}
                  className="rounded p-1.5 text-text-3 transition-colors hover:text-teal"
                  title="Message"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {hasPartnerLeg && partnerFact && !portal && (
        <div className="flex flex-wrap gap-1.5">
          <MemoryChip factId={partnerFact.id} />
        </div>
      )}

      {/* responsibility timeline — who bears risk per segment; draws left→right 700ms */}
      {hasPartnerLeg && (
        <div>
          <div className="mb-1.5 text-micro uppercase text-text-3">Responsibility · risk per segment</div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
            {movement.legs.map((leg, i) => {
              const total = movement.legs.reduce((s, l) => s + (l.distanceKm ?? 1), 0);
              const pct = ((leg.distanceKm ?? 1) / total) * 100;
              return (
                <motion.div
                  key={leg.id}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
                  style={{ width: `${pct}%`, transformOrigin: 'left center' }}
                  className={cn('h-full', leg.partnerName ? 'bg-teal' : 'bg-ember')}
                  title={`${leg.from} → ${leg.to} · ${leg.partnerName ?? tenant.name}`}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-caption text-text-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ember" /> {tenant.name}
            </span>
            {movement.legs
              .filter((l) => l.partnerName)
              .map((l) => (
                <span key={l.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal" /> {portal ? `${tenant.name} network` : l.partnerName}
                </span>
              ))}
            <span className="ml-auto font-mono text-[10px]">switches at handoff</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Tab 4 — Exceptions ----------

function ExceptionsTab({
  movement,
  pendingException,
  localExceptions,
  onRaiseException,
}: {
  movement: Movement;
  pendingException?: ApprovalAction;
  localExceptions: LocalException[];
  onRaiseException?: () => void;
}) {
  return (
    <div className="space-y-2.5">
      {/* resolved example (weighbridge variance, learned into memory) */}
      {movement.id === 'MR-2481' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="rounded-card border border-ok/25 bg-ok/5 p-3"
        >
          <div className="flex items-center gap-2 text-small text-text-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
            Weighbridge variance +180kg at Mariakani
            <span className="ml-auto rounded-chip border border-ok/30 bg-ok/10 px-1.5 py-px font-mono text-[10px] uppercase text-ok">resolved</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-caption text-text-2">
            reweigh confirmed tare error — logged as memory
            <MemoryChip
              label="weighbridge Mariakani +0.2% bias learned"
              confidence={74}
              source="behavior"
              evidence={['reweigh ticket · Mariakani']}
              evidenceCount={1}
            />
          </div>
        </motion.div>
      )}

      {/* active exception → inline governed ApprovalCard */}
      {movement.exceptionNote && pendingException && (
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-small text-warn">
            <AlertTriangle className="h-3.5 w-3.5" />
            {movement.exceptionNote}
            <span className="ml-auto rounded-chip border border-warn/30 bg-warn/10 px-1.5 py-px font-mono text-[10px] uppercase text-warn">active</span>
          </div>
          <ApprovalCard action={pendingException} />
        </div>
      )}
      {movement.exceptionNote && !pendingException && (
        <div className="rounded-card border border-warn/25 bg-warn/5 p-3 text-small text-warn">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          {movement.exceptionNote}
        </div>
      )}

      {/* locally raised exceptions */}
      {localExceptions.map((ex) => (
        <motion.div
          key={ex.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="rounded-card border border-danger/25 bg-danger/5 p-3"
        >
          <div className="flex items-center gap-2 text-small text-text-1">
            <AlertTriangle className="h-3.5 w-3.5 text-danger" />
            {ex.note}
            <span className="ml-auto rounded-chip border border-danger/30 bg-danger/10 px-1.5 py-px font-mono text-[10px] uppercase text-danger">{ex.type}</span>
          </div>
          <div className="mt-1 text-caption text-text-3">raised by you · Conductor is recalculating</div>
        </motion.div>
      ))}

      {!movement.exceptionNote && localExceptions.length === 0 && movement.id !== 'MR-2481' && (
        <div className="rounded-card border border-line-hairline bg-surface-2/40 p-4 text-center text-caption text-text-3">
          No exceptions on this movement — the corridor is quiet.
        </div>
      )}

      <button
        onClick={onRaiseException}
        className="flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line-strong px-3 py-2 text-small text-text-2 transition-colors hover:border-danger/50 hover:text-text-1"
      >
        <Plus className="h-3.5 w-3.5" /> Add exception
      </button>
    </div>
  );
}
