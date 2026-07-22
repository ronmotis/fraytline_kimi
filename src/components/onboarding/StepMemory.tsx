import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileSpreadsheet, FileText, FileArchive, UploadCloud, X } from 'lucide-react';
import ConfidenceRing from '@/components/ConfidenceRing';
import { useStore, uid } from '@/store';
import type { FactKind } from '@/store';
import { NumberTick, ThinkingDots } from './bits';
import { EASE_OUT_EXPO } from './types';
import type { DocFile, ExtractedFact } from './types';
import { cn } from '@/lib/utils';

interface PoolFact {
  label: string;
  confidence: number;
  kind: FactKind;
}

const POOLS: Record<string, PoolFact[]> = {
  'rates-corridor.xlsx': [
    { label: 'Nairobi→Kampala · FTL · $1,850 avg', confidence: 94, kind: 'lane' },
    { label: 'Mombasa→Kigali · FTL · $4,100 avg', confidence: 89, kind: 'lane' },
  ],
  'fleet-list.pdf': [
    { label: '14 vehicles · 4 Volvo FH · plates KDJ…', confidence: 97, kind: 'pattern' },
  ],
  'invoices-march.zip': [
    { label: 'Bidco Africa · net-30 · morning pickups', confidence: 86, kind: 'customer' },
    { label: 'Busia border · avg wait 3.2h', confidence: 78, kind: 'border' },
  ],
};

const SAMPLES = [
  { name: 'rates-corridor.xlsx', icon: FileSpreadsheet },
  { name: 'fleet-list.pdf', icon: FileText },
  { name: 'invoices-march.zip', icon: FileArchive },
];

/** Step 2 — Feed the Memory ("Show me how you work"). Document ingest → extraction stream. */
export default function StepMemory({
  onFactLanded,
  onContinue,
  onSkip,
}: {
  onFactLanded: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const teachFact = useStore((s) => s.teachFact);
  const forgetFact = useStore((s) => s.forgetFact);
  const [files, setFiles] = useState<DocFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const timers = useRef<Map<string, number[]>>(new Map());
  // refs to avoid stale closures inside timeouts
  const teachRef = useRef(teachFact);
  const landedRef = useRef(onFactLanded);
  useEffect(() => {
    teachRef.current = teachFact;
    landedRef.current = onFactLanded;
  });

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((ts) => ts.forEach((t) => window.clearTimeout(t)));
    };
  }, []);

  const addFile = (name: string) => {
    if (files.some((f) => f.name === name)) return;
    const id = uid('doc');
    const pool =
      POOLS[name] ??
      // unknown dropped file — extract from an unused sample pool (simulated)
      (Object.entries(POOLS).find(([k]) => !files.some((f) => f.name === k))?.[1] ??
        POOLS['rates-corridor.xlsx']);
    setFiles((prev) => [...prev, { id, name, status: 'parsing', facts: [] }]);

    const ts: number[] = [];
    // progress hairline runs 900ms, then facts stream in one per 350ms
    ts.push(
      window.setTimeout(() => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'streaming' } : f)));
        pool.forEach((pf, i) => {
          ts.push(
            window.setTimeout(() => {
              const taught = teachRef.current({ label: pf.label, kind: pf.kind });
              const fact: ExtractedFact = {
                id: uid('xf'),
                file: name,
                label: pf.label,
                confidence: pf.confidence,
                kind: pf.kind,
                factId: taught.id,
              };
              setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, facts: [...f.facts, fact] } : f)),
              );
              landedRef.current();
              if (i === pool.length - 1) {
                ts.push(
                  window.setTimeout(() => {
                    setFiles((prev) =>
                      prev.map((f) => (f.id === id ? { ...f, status: 'done' } : f)),
                    );
                  }, 200),
                );
              }
            }, 350 * (i + 1)),
          );
        });
      }, 900),
    );
    timers.current.set(id, ts);
  };

  const removeFile = (file: DocFile) => {
    timers.current.get(file.id)?.forEach((t) => window.clearTimeout(t));
    timers.current.delete(file.id);
    file.facts.forEach((f) => f.factId && forgetFact(f.factId));
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  const allFacts = files.flatMap((f) => f.facts);
  const busy = files.some((f) => f.status !== 'done');
  const done = files.length > 0 && !busy;

  return (
    <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 pb-16 pt-28">
      <div className="grid w-full max-w-[1100px] grid-cols-1 gap-10 lg:grid-cols-11">
        {/* left — drop zone (55%) */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            <h1 className="font-display text-h1 text-text-1">Show me how you work</h1>
            <p className="mt-2 text-body text-text-2">
              Your documents already know your business. I'll read them — you confirm what I learn.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.09 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              Array.from(e.dataTransfer.files)
                .slice(0, 3)
                .forEach((f) => addFile(f.name));
            }}
            className={cn(
              'mt-8 flex h-[320px] flex-col items-center justify-center gap-4 rounded-modal border border-dashed px-8 text-center transition-colors duration-200',
              dragOver ? 'border-teal bg-teal-dim' : 'border-line-strong bg-surface-1/50',
            )}
          >
            <UploadCloud className="h-10 w-10 text-teal" strokeWidth={1.5} />
            <p className="max-w-[380px] text-body text-text-2">
              Drop anything that describes your business — rate cards, fleet lists, past invoices,
              contracts, export of your old TMS.
            </p>
            <p className="text-small text-text-3">
              I read, extract, and cite. You confirm. I never assume silently.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.18 }}
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <span className="text-small text-text-3">or click to use samples:</span>
            {SAMPLES.map(({ name, icon: Icon }) => {
              const used = files.some((f) => f.name === name);
              return (
                <motion.button
                  key={name}
                  onClick={() => addFile(name)}
                  disabled={used}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    'flex items-center gap-2 rounded-chip border px-3 py-1.5 font-mono text-data transition-colors',
                    used
                      ? 'cursor-default border-teal/40 bg-teal-dim text-teal'
                      : 'border-line-strong text-text-2 hover:border-teal hover:text-teal',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {name}
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center gap-4"
          >
            <button
              onClick={onContinue}
              className="rounded-chip bg-ember px-6 py-2.5 text-body-strong text-canvas transition-all duration-150 hover:-translate-y-px hover:bg-ember-hi"
            >
              Looks right — continue
            </button>
            <button
              onClick={onSkip}
              className="text-small text-text-3 transition-colors hover:text-text-1"
            >
              Skip for now
            </button>
          </motion.div>
        </div>

        {/* right — extraction stream (45%) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.14 }}
          className="lg:col-span-5"
        >
          <div className="rounded-panel border border-line-hairline bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              {busy ? (
                <span className="flex items-center gap-2 text-small text-teal">
                  Learning… <ThinkingDots />
                </span>
              ) : done ? (
                <span className="text-small text-text-1">
                  <NumberTick value={23} className="text-data text-teal" />
                  <span className="text-text-2"> facts extracted · </span>
                  <span className="font-mono text-data text-text-2">0</span>
                  <span className="text-text-2"> assumed</span>
                </span>
              ) : (
                <span className="text-small text-text-3">Extraction stream</span>
              )}
            </div>

            {/* file cards */}
            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {files.map((f) => (
                  <motion.div
                    key={f.id}
                    layout="position"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="rounded-card border border-line-hairline bg-surface-2 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-data text-text-1">{f.name}</span>
                      <button
                        onClick={() => removeFile(f)}
                        className="shrink-0 text-text-3 transition-colors hover:text-danger"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 h-px w-full bg-line-hairline">
                      {f.status === 'parsing' ? (
                        <motion.div
                          className="h-px bg-teal"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 0.9, ease: 'easeInOut' }}
                        />
                      ) : (
                        <div className="h-px w-full bg-teal/60" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* fact rows */}
            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {allFacts.map((fact) => (
                  <motion.div
                    key={fact.id}
                    layout="position"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                    className="flex items-center gap-2 rounded-chip border border-teal/20 bg-teal-dim px-2.5 py-1.5"
                  >
                    <span className="text-[10px] text-teal">◈</span>
                    <span className="min-w-0 flex-1 truncate text-caption text-teal">
                      {fact.label}
                    </span>
                    <ConfidenceRing value={fact.confidence} size={16} />
                    <span className="shrink-0 font-mono text-[10px] text-text-3">
                      from {fact.file}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {files.length === 0 && (
                <p className="py-8 text-center text-small text-text-3">
                  Facts I extract will stream in here — each one cited, with its confidence.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
