import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import FleetTimeline from '@/components/dispatch/FleetTimeline';
import AssignBoard from '@/components/dispatch/AssignBoard';
import SuggestionStack from '@/components/dispatch/SuggestionStack';
import DriverManifest from '@/components/dispatch/DriverManifest';
import { TODAY_IDX, WEEK_DAYS, isUnassigned } from '@/components/dispatch/dispatchUtils';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function Dispatch() {
  const tenant = useActiveTenant();
  const role = useStore((s) => s.role);
  const location = useLocation();
  const movements = useStore((s) => s.movements.filter((m) => m.tenantId === s.activeTenantId));
  const fleet = useStore((s) => s.fleet.filter((v) => v.tenantId === s.activeTenantId));
  const [manifestView, setManifestView] = useState(location.hash === '#manifest');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const preselect = (location.state as { assign?: string } | null)?.assign;

  useEffect(() => {
    setManifestView(location.hash === '#manifest');
  }, [location.hash]);

  // quote-to-dispatch handoff: "Assign now →" from /quotes pre-focuses assignment
  useEffect(() => {
    if (preselect) setSuggestionsOpen(true);
  }, [preselect]);

  const queue = movements.filter(isUnassigned);
  const unassignedCount = queue.length;

  // the Conductor's proposed pairing → dashed gantt bar + suggestion card
  const proposed = useMemo(() => {
    const target = tenant.id === 'savannah'
      ? movements.find((m) => m.id === 'SV-106')
      : movements.find((m) => m.id === 'MR-2483');
    if (!target || target.vehiclePlate) return undefined;
    return {
      movement: target,
      vehicleId: tenant.id === 'savannah' ? 'v-ge2210' : 'v-kdj482t',
    };
  }, [movements, tenant.id]);

  // Owner lens — utilization promoted
  const avgUtil = useMemo(() => {
    if (fleet.length === 0) return 0;
    const per = fleet.map((v) => (v.status === 'en-route' ? 0.62 : v.status === 'available' ? 0.34 : v.status === 'service-due' ? 0.1 : 0.22));
    return Math.round((per.reduce((a, b) => a + b, 0) / per.length) * 100);
  }, [fleet]);

  // ---- Driver role / #manifest → manifest view ----
  if (role === 'Driver' || manifestView) {
    return (
      <div>
        {role !== 'Driver' && (
          <button
            onClick={() => setManifestView(false)}
            className="mb-4 flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to board
          </button>
        )}
        <div className="mb-4 text-center">
          <h1 className="font-display text-h1 text-text-1">Manifest</h1>
          <p className="mt-1 text-caption text-text-3">{tenant.name} · driver view · thumb-sized, cab-ready</p>
        </div>
        <DriverManifest />
      </div>
    );
  }

  // ---- Board view ----
  return (
    <div>
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="mb-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-h1 text-text-1">Dispatch</h1>
          <p className="mt-1 text-caption text-text-3">
            {tenant.name} · {fleet.length} trucks · {unassignedCount} unassigned
            {role === 'Owner' ? ` · fleet utilization ${avgUtil}%` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* week strip */}
          <div className="hidden items-center gap-1 lg:flex">
            {WEEK_DAYS.map((d, i) => (
              <span
                key={d}
                className={cn(
                  'rounded-chip border px-2 py-1 font-mono text-[10px]',
                  i === TODAY_IDX ? 'border-ember/50 bg-ember-dim text-ember' : 'border-line-hairline text-text-3',
                )}
              >
                {d}
              </span>
            ))}
          </div>
          <button
            onClick={() => setSuggestionsOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-chip border px-3.5 py-2 text-small font-medium transition-colors',
              suggestionsOpen ? 'border-teal bg-teal-dim text-teal' : 'border-teal/40 bg-teal-dim/50 text-teal hover:border-teal',
            )}
          >
            <Sparkles className="h-4 w-4" />
            Conductor suggestions ({proposed ? 2 : 1})
          </button>
        </div>
      </motion.div>

      {/* auto-assign suggestions */}
      {suggestionsOpen && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="mb-4 overflow-hidden"
        >
          <div className="rounded-panel border border-teal/20 bg-teal-dim/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-micro uppercase text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-dot" />
              Conductor · reasoned assignments ◈
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <SuggestionStack />
            </div>
          </div>
        </motion.section>
      )}

      {/* fleet timeline */}
      <FleetTimeline proposed={proposed} />

      {/* queue + fleet grid */}
      <AssignBoard
        preselectId={preselect}
        canDrag={role === 'Dispatcher'}
        onOpenManifest={() => setManifestView(true)}
      />

      {role !== 'Dispatcher' && (
        <div className="mt-4 rounded-card border border-line-hairline bg-surface-1 p-3 text-center text-caption text-text-3">
          Board is read-mostly as {role} — switch <span className="text-teal">View as: Dispatcher</span> to drag-assign, or approve a Conductor suggestion above.
        </div>
      )}
    </div>
  );
}
