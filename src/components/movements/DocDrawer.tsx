// Doc drawer (movements.md §B2/B3) — glass overlay with a border dossier checklist,
// live wait times, and the fields the OS extracted from each document.
// Opened either from a spine border node (border dossier) or from the Documents tab.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';
import type { BorderCrossing, Doc, Movement } from '@/store';
import { useStore } from '@/store';
import DocChip from '@/components/DocChip';
import ConfidenceRing from '@/components/ConfidenceRing';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';

const SPRING_PANEL = { type: 'spring', stiffness: 220, damping: 26 } as const;

export interface DocDrawerTarget {
  border?: BorderCrossing;
  docId?: string;
}

export default function DocDrawer({
  movement,
  target,
  onClose,
}: {
  movement: Movement;
  target: DocDrawerTarget | null;
  onClose: () => void;
}) {
  const pushToast = useStore((s) => s.pushToast);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // adjust state during render when a new drawer target arrives
  const [prevTarget, setPrevTarget] = useState(target);
  if (prevTarget !== target) {
    setPrevTarget(target);
    setSelectedId(target?.docId ?? null);
  }

  const border = target?.border;
  const doc: Doc | undefined =
    movement.docs.find((d) => d.id === selectedId) ??
    movement.docs.find((d) => d.status !== 'verified') ??
    movement.docs[0];

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[75] bg-canvas/60"
            style={{ backdropFilter: 'blur(8px)' }}
          />
          <motion.aside
            key="drawer"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={SPRING_PANEL}
            className="glass fixed bottom-0 right-0 top-14 z-[80] flex w-[380px] flex-col border-l border-line-strong shadow-modal"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line-hairline p-5">
              <div>
                <div className="text-micro uppercase text-text-3">
                  {border ? 'Border dossier' : 'Document drawer'}
                </div>
                <div className="mt-1 font-display text-h2 text-text-1">
                  {border ? border.name : `${movement.from} → ${movement.to}`}
                  {border && (
                    <>
                      {' '}
                      <span className="font-mono text-h3 text-text-2">
                        {border.fromCountry}/{border.toCountry}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="rounded p-1 text-text-3 transition-colors hover:text-text-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* live wait */}
              {border && (
                <div className="flex items-center gap-3 rounded-card border border-line-hairline bg-surface-1 p-3">
                  <div>
                    <div className="text-micro uppercase text-text-3">
                      {border.status === 'waiting' ? 'Live wait' : border.status === 'cleared' ? 'Cleared in' : 'Predicted wait'}
                    </div>
                    <div className={cn('mt-0.5 font-mono text-data-lg', border.status === 'waiting' ? 'text-warn' : 'text-text-1')}>
                      {border.waitHours ?? border.avgHours ?? '—'}h
                    </div>
                  </div>
                  {border.avgHours !== undefined && (
                    <MemoryChip
                      label={`your avg ${border.avgHours}h${border.trend === 'down' ? ' · trending down' : ''}`}
                      confidence={88}
                      source="behavior"
                      evidence={['border telematics · last 90 days']}
                      evidenceCount={23}
                    />
                  )}
                </div>
              )}

              {/* doc checklist */}
              <div>
                <div className="mb-2 text-micro uppercase text-text-3">
                  Checklist · {movement.docs.filter((d) => d.status === 'verified').length}/{movement.docs.length} verified
                </div>
                <div className="space-y-1.5">
                  {movement.docs.map((d, i) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setSelectedId(d.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedId(d.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-card border px-2.5 py-2 text-left transition-colors duration-150',
                        doc?.id === d.id ? 'border-teal/40 bg-teal-dim/40' : 'border-line-hairline bg-surface-1 hover:border-line-strong',
                      )}
                    >
                      <DocChip doc={d} />
                      <span className="font-mono text-[10px] uppercase text-text-3">{d.status}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* extracted fields */}
              {doc && (
                <div className="rounded-card border border-line-hairline bg-surface-1 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-micro uppercase text-text-3">Extracted by OS · {doc.name}</span>
                    <ConfidenceRing value={97} size={22} showLabel />
                  </div>
                  {/* preview placeholder */}
                  <div className="mb-3 flex h-24 items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-2 text-caption text-text-3">
                    Document preview
                  </div>
                  {doc.fields && doc.fields.length > 0 ? (
                    <div className="space-y-1.5">
                      {doc.fields.map((f) => (
                        <div key={f.label} className="flex items-center justify-between gap-2 text-caption">
                          <span className="text-text-3">{f.label}</span>
                          <span className="rounded bg-teal-dim px-1.5 py-0.5 font-mono text-[11px] text-teal">
                            ◈ {f.value} · 97%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-caption text-text-3">
                      {doc.status === 'missing'
                        ? 'Missing — the OS will request it from the corridor checklist.'
                        : 'Awaiting extraction — fields appear here once parsed.'}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => pushToast({ title: `${doc.name} downloaded`, body: 'docs pack · PDF', tone: 'ok' })}
                      className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:text-text-1"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                    <button
                      onClick={() => pushToast({ title: `${doc.name} replacement requested`, body: 'Conductor will re-extract fields on upload', tone: 'teal' })}
                      className="flex items-center gap-1.5 rounded-chip border border-line-strong px-2.5 py-1.5 text-caption text-text-2 transition-colors hover:text-text-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Replace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
