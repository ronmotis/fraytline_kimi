import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Shuffle } from 'lucide-react';
import { useStore } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface Suggestion {
  id: string;
  title: string;
  context: string;
  reasoning: string[];
  confidence: number;
  approveLabel: string;
  onApprove: () => void;
}

/**
 * Conductor auto-assign suggestions (dispatch.md §1) — governed one-click
 * approvals that slide in from the dock side.
 */
export default function SuggestionStack({ onResolved }: { onResolved?: () => void }) {
  const tenantId = useStore((s) => s.activeTenantId);
  const movements = useStore((s) => s.movements);
  const assignDriver = useStore((s) => s.assignDriver);
  const teachFact = useStore((s) => s.teachFact);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const [whyOpen, setWhyOpen] = useState<string | null>(null);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (tenantId === 'savannah') {
      return [
        {
          id: 'sug-sv-assign',
          title: 'Assign SV-106 to GE 2210-22 — Kofi',
          context: 'Accra → Ouagadougou · Fri 06:00 pickup · 14t FMCG',
          reasoning: [
            'Kofi is free now at Accra depot — 8h drive time available',
            'SV-106 is your one cross-border run — ECOWAS Brown Card still pending',
            'Yaw returns from Kumasi too late for the Friday window ◈',
          ],
          confidence: 86,
          approveLabel: 'Approve',
          onApprove: () => assignDriver('SV-106', 'v-ge2210'),
        },
        {
          id: 'sug-sv-service',
          title: 'Hold GR 5566-24 from bookings — service due in 2 days ◈',
          context: 'Isuzu FVR · Accra workshop',
          reasoning: [
            'Service window opens Thursday — bookings after Wed risk a roadside stop',
            'GW 8832-23 covers local Tema runs meanwhile',
          ],
          confidence: 78,
          approveLabel: 'Approve',
          onApprove: () => teachFact({ label: 'GR 5566-24 held from bookings — service window', kind: 'rule' }),
        },
      ];
    }
    return [
      {
        id: 'sug-assign-2483',
        title: 'Assign MR-2483 (Kampala→Nairobi, Thu) to KDJ 482T',
        context: 'Joseph Kiprop · Volvo FH · 18t transformer units · KenGen',
        reasoning: [
          'Joseph finishes leg 2 in Kampala Wed 14:30 — deadhead is 12 km',
          'KDJ 482T returns empty otherwise ◈ backhaul window',
          'COMESA ✓ · Busia dossier ready · driver hours clear',
        ],
        confidence: 92,
        approveLabel: 'Approve',
        onApprove: () => assignDriver('MR-2483', 'v-kdj482t'),
      },
      {
        id: 'sug-hold-kdm',
        title: 'Hold KDM 930B from Friday bookings — service due ◈ 5 days',
        context: 'Volvo FM · Nairobi depot',
        reasoning: [
          'Service window opens Friday — a Thu–Sat booking risks a roadside stop',
          'KDL 117C covers the conflict window (available Thu)',
        ],
        confidence: 81,
        approveLabel: 'Approve',
        onApprove: () => teachFact({ label: 'KDM 930B held from Friday bookings — service window', kind: 'rule' }),
      },
    ];
  }, [tenantId, assignDriver, teachFact]);

  // auto-resolve the assign suggestion once the movement has a vehicle
  const visible = suggestions.filter((s) => {
    if (resolved[s.id]) return false;
    const m = s.id.includes('2483') ? movements.find((x) => x.id === 'MR-2483')
      : s.id.includes('SV-106') || s.id.includes('sv-assign') ? movements.find((x) => x.id === 'SV-106')
      : undefined;
    if (m?.vehiclePlate) return false;
    return true;
  });

  return (
    <div className="space-y-2.5">
      <AnimatePresence>
        {visible.map((s, i) => (
          <motion.div
            key={s.id}
            layout="position"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3, ease: EASE }}
            className="overflow-hidden rounded-card border border-teal/25 bg-surface-1 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-body-strong text-text-1">{s.title}</div>
                <div className="mt-0.5 text-caption text-text-2">{s.context}</div>
              </div>
              <ConfidenceRing value={s.confidence} size={28} showLabel />
            </div>

            <button
              onClick={() => setWhyOpen(whyOpen === s.id ? null : s.id)}
              className="mt-2 flex items-center gap-1 text-caption text-teal transition-colors hover:text-text-1"
            >
              Why <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', whyOpen === s.id && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {whyOpen === s.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5 rounded-card border border-line-hairline bg-surface-2 p-3">
                    {s.reasoning.map((r, ri) => (
                      <div key={ri} className="flex gap-2 text-caption text-text-2">
                        <span className="font-mono text-teal">{ri + 1}.</span> {r}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { s.onApprove(); setResolved((r) => ({ ...r, [s.id]: true })); onResolved?.(); }}
                className="flex items-center gap-1.5 rounded-chip bg-ember px-3 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
              >
                <Check className="h-3.5 w-3.5" /> {s.approveLabel}
              </button>
              <button
                onClick={() => setResolved((r) => ({ ...r, [s.id]: true }))}

                className="flex items-center gap-1.5 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 transition-colors hover:text-text-1"
              >
                <Shuffle className="h-3.5 w-3.5" /> Pick another
              </button>
            </div>
            <div className="mt-2 text-[10px] text-text-3">governed · logged to Ledger</div>
          </motion.div>
        ))}
      </AnimatePresence>
      {visible.length === 0 && (
        <div className="rounded-card border border-dashed border-line-hairline p-4 text-center text-caption text-text-3">
          No open suggestions — the board is current.
        </div>
      )}
    </div>
  );
}
