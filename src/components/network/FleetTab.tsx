// Fleet tab (network.md §3): truck cards with compliance DocChips, utilization
// bars, a Living-Border Conductor insight, and a vehicle drawer with history.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, TriangleAlert, X } from 'lucide-react';
import { useStore, useTenantFleet, useTenantMovements } from '@/store';
import type { Doc, FleetUnit } from '@/store';
import DocChip from '@/components/DocChip';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';
import { UNIT_META } from './networkData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const STATUS: Record<FleetUnit['status'], { label: (u: FleetUnit) => string; cls: string; live?: boolean }> = {
  'en-route': { label: () => 'en route', cls: 'border-ember/30 bg-ember-dim text-ember', live: true },
  available: { label: (u) => `available ${u.availableAt ?? ''}`.trim(), cls: 'border-ok/30 bg-ok/10 text-ok' },
  'service-due': { label: (u) => `service due ${u.serviceDueDays ?? ''}d`.trim(), cls: 'border-warn/30 bg-warn/10 text-warn', live: true },
  yard: { label: () => 'yard', cls: 'border-line-hairline bg-surface-2 text-text-3' },
};

const unitDocs = (u: FleetUnit): Doc[] => {
  if (u.tenantId === 'savannah') {
    return [
      { id: `${u.id}-d1`, name: 'Insurance', status: 'verified' },
      { id: `${u.id}-d2`, name: 'Road worthy', status: u.status === 'service-due' ? 'expiring' : 'verified', expiresInHours: u.status === 'service-due' ? (u.serviceDueDays ?? 2) * 24 : undefined },
    ];
  }
  return [
    { id: `${u.id}-d1`, name: 'COMESA', status: 'verified' },
    { id: `${u.id}-d2`, name: 'Insurance', status: 'verified' },
    { id: `${u.id}-d3`, name: 'Inspection', status: u.status === 'service-due' ? 'expiring' : 'verified', expiresInHours: u.status === 'service-due' ? (u.serviceDueDays ?? 5) * 24 : undefined },
  ];
};

const INSIGHT: Record<string, { text: string; factId?: string; action: string }> = {
  meridian: {
    text: 'KDM 930B utilization 41% and service due — releasing Friday bookings saves a missed pickup ◈.',
    action: 'Friday bookings for KDM 930B released · queued for approval',
  },
  savannah: {
    text: 'GR 5566-24 service due in 2 days — swapping Thursday’s Takoradi run to GE 2210-22 keeps the week clean ◈.',
    action: 'Thursday’s Takoradi run swapped to GE 2210-22 · queued for approval',
  },
};

export default function FleetTab() {
  const fleet = useTenantFleet();
  const drivers = useStore((s) => s.drivers);
  const tenantId = useStore((s) => s.activeTenantId);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<FleetUnit | null>(null);
  const [applied, setApplied] = useState(false);

  const insight = INSIGHT[tenantId] ?? INSIGHT.meridian;
  const driverOf = (u: FleetUnit) => drivers.find((d) => d.id === u.driverId);

  return (
    <div className="space-y-4">
      {/* Conductor insight — Living Border */}
      {!applied && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="living-border flex flex-wrap items-center gap-3 rounded-card border border-line-hairline bg-surface-1 p-4"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-teal" />
          <p className="min-w-0 flex-1 text-small text-text-1">{insight.text}</p>
          <button
            onClick={() => {
              setApplied(true);
              pushToast({ title: 'Suggestion applied', body: `${insight.action} · logged to Ledger`, tone: 'teal', ledgerLink: true });
            }}
            className="rounded-chip bg-ember px-3 py-1.5 text-caption font-medium text-canvas transition-colors hover:bg-ember-hi"
          >
            Apply suggestion
          </button>
        </motion.div>
      )}

      {/* truck cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fleet.map((u, i) => {
          const meta = UNIT_META[u.id] ?? { util: 50, km: '—' };
          const driver = driverOf(u);
          const st = STATUS[u.status];
          return (
            <motion.button
              key={u.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.24, ease: EASE }}
              onClick={() => setSelected(u)}
              className="rounded-card border border-line-hairline bg-surface-1 p-5 text-left transition-colors duration-150 hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                {/* plate tile */}
                <span className="rounded-chip border border-line-strong bg-surface-3 px-2.5 py-1 font-mono text-data font-semibold tracking-wide text-text-1">
                  {u.plate}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-micro uppercase', st.cls)}>
                  {st.live && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />}
                  {st.label(u)}
                  {u.status === 'service-due' && <TriangleAlert className="h-3 w-3" />}
                </span>
              </div>

              <div className="mt-2 text-small text-text-2">{u.model} · {u.location}</div>

              <div className="mt-2.5 flex items-center gap-2">
                {driver ? (
                  <>
                    {driver.avatar ? (
                      <img src={driver.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 font-mono text-[9px] text-text-2">
                        {driver.name.split(' ').map((w) => w[0]).join('')}
                      </span>
                    )}
                    <span className="text-caption text-text-1">{driver.name}</span>
                  </>
                ) : (
                  <span className="text-caption text-text-3">unassigned</span>
                )}
              </div>

              {/* compliance docs */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {unitDocs(u).map((d) => <DocChip key={d.id} doc={d} />)}
              </div>

              {/* utilization */}
              <div className="mt-3.5">
                <div className="flex items-center justify-between text-caption text-text-3">
                  <span>utilization · week</span>
                  <span className={cn('font-mono', meta.util >= 60 ? 'text-teal' : 'text-warn')}>{meta.util}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: meta.util / 100 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: EASE }}
                    className={cn('h-full origin-left rounded-full', meta.util >= 60 ? 'bg-teal' : 'bg-warn')}
                  />
                </div>
              </div>

              <div className="mt-3 font-mono text-data text-text-3">{meta.km} · avg {meta.util}% util</div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && <VehicleDrawer unit={selected} onClose={() => setSelected(null)} onReassign={() => { setSelected(null); navigate('/dispatch'); }} />}
      </AnimatePresence>
    </div>
  );
}

// ---------- vehicle drawer ----------

function VehicleDrawer({ unit, onClose, onReassign }: { unit: FleetUnit; onClose: () => void; onReassign: () => void }) {
  const movements = useTenantMovements();
  const drivers = useStore((s) => s.drivers);
  const pushToast = useStore((s) => s.pushToast);
  const driver = drivers.find((d) => d.id === unit.driverId);
  const history = movements.filter((m) => m.vehiclePlate === unit.plate || m.legs.some((l) => l.vehiclePlate === unit.plate));
  const meta = UNIT_META[unit.id] ?? { util: 50, km: '—' };

  return (
    <div className="fixed inset-0 z-[80]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-canvas/60 backdrop-blur-[8px]" />
      <motion.div
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="absolute bottom-0 right-0 top-0 w-[480px] max-w-full overflow-y-auto border-l border-line-strong bg-surface-1 p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="rounded-chip border border-line-strong bg-surface-3 px-2.5 py-1 font-mono text-data font-semibold text-text-1">{unit.plate}</span>
            <div className="mt-2 font-display text-h2 text-text-1">{unit.model}</div>
            <div className="text-caption text-text-2">{unit.location} · {meta.km} · avg {meta.util}% util</div>
          </div>
          <button onClick={onClose} className="text-text-3 transition-colors hover:text-text-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-card border border-line-hairline bg-surface-2 p-4">
          <div className="text-micro uppercase text-text-3">Assigned driver</div>
          {driver ? (
            <div className="mt-2 flex items-center gap-2.5">
              {driver.avatar ? (
                <img src={driver.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] text-text-2">
                  {driver.name.split(' ').map((w) => w[0]).join('')}
                </span>
              )}
              <div className="flex-1">
                <div className="text-small text-text-1">{driver.name}</div>
                <div className="text-caption text-text-3">{driver.status} · {driver.hoursLeft}h left today</div>
              </div>
              <button
                onClick={() => {
                  pushToast({ title: 'Opening Dispatch to reassign', body: unit.plate, tone: 'teal' });
                  onReassign();
                }}
                className="rounded-chip border border-line-strong px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:border-teal hover:text-teal"
              >
                Reassign
              </button>
            </div>
          ) : (
            <div className="mt-2 text-small text-text-3">No driver assigned.</div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-micro uppercase text-text-3">Compliance</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unitDocs(unit).map((d) => <DocChip key={d.id} doc={d} />)}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-micro uppercase text-text-3">Movement history</div>
          <div className="mt-2 space-y-1.5">
            {history.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-card border border-line-hairline bg-surface-2 p-2.5">
                <span className="font-mono text-data text-text-2">{m.id}</span>
                <span className="flex-1 text-small text-text-1">{m.from} → {m.to}</span>
                <span className="text-caption text-text-3">{m.status}</span>
              </div>
            ))}
            {history.length === 0 && (
              <div className="flex items-center gap-2 text-small text-text-3">
                No movements on record for this unit yet
                <MemoryChip label="history builds from first dispatch" confidence={100} source="behavior" evidence={['ledger']} />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
