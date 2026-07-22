import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useActiveTenant, useTenantFacts } from '@/store';
import EntityGraph from '@/components/memory/EntityGraph';
import FactStream from '@/components/memory/FactStream';
import type { StreamTab } from '@/components/memory/FactStream';
import TeachBar from '@/components/memory/TeachBar';
import type { TeachBarHandle } from '@/components/memory/TeachBar';
import LearningFeed from '@/components/memory/LearningFeed';
import { GRAPHS } from '@/components/memory/graphData';
import { tintStyle } from '@/components/memory/tints';
import { confidenceColor } from '@/components/ConfidenceRing';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Number Tick (§6.2.6) */
function Tick({ value, format }: { value: number; format?: (v: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => (format ? format(v) : String(Math.round(v))));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: EASE });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

/** Model health ring — tweens 0 → model-health over 900ms (memory.md §1). */
function HealthRing({ value, size = 56 }: { value: number; size?: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(mv, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => c.stop();
  }, [value, mv]);
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = confidenceColor(display);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-hairline)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - display / 100)}
        />
      </svg>
      <span className="absolute font-mono text-[11px] font-semibold leading-none" style={{ color }}>
        {Math.round(display)}
      </span>
    </span>
  );
}

export default function Memory() {
  const tenant = useActiveTenant();
  const facts = useTenantFacts();
  const teachRef = useRef<TeachBarHandle>(null);

  const [tab, setTab] = useState<StreamTab>('All');
  const [query, setQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [taughtText, setTaughtText] = useState<string | null>(null);

  const graph = GRAPHS[tenant.id] ?? GRAPHS.meridian;
  const pendingCount = facts.filter((f) => f.status === 'unreviewed').length;
  const health = useMemo(
    () => (facts.length ? Math.round(facts.reduce((a, f) => a + f.confidence, 0) / facts.length) : 0),
    [facts],
  );
  const lastUpdated = facts.find((f) => f.updatedAt === 'just now')?.updatedAt ?? facts[0]?.updatedAt ?? '—';

  const openStream = (t: string, q?: string) => {
    setTab(t as StreamTab);
    setQuery(q ?? '');
  };

  const focusFact = (factId: string) => {
    setTab('All');
    setQuery('');
    setHighlightId(factId);
    setTimeout(() => setHighlightId(null), 2400);
  };

  const onTeach = (prefill: string) => {
    teachRef.current?.prefill(prefill);
    teachRef.current?.focus();
    // the app shell scrolls <main>, not window
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* ---------- Section 1: Header ---------- */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-h1 text-text-1">Operator Model</h1>
            <p className="mt-1.5 max-w-xl text-body text-text-2">
              Everything Fraytline believes about {tenant.name} — and how sure it is.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <HealthRing value={health} />
              <div>
                <div className="text-micro uppercase text-text-3">Model health</div>
                <div className="text-caption text-text-2">confidence-weighted</div>
              </div>
            </div>
            <div className="h-10 w-px bg-line-hairline" />
            <div className="flex items-center gap-5">
              <div>
                <div className="font-mono text-data-lg text-text-1">
                  <Tick value={facts.length} />
                </div>
                <div className="text-micro uppercase text-text-3">facts</div>
              </div>
              <div>
                <div className="font-mono text-data-lg text-text-1">
                  <Tick value={graph.nodes.length} />
                </div>
                <div className="text-micro uppercase text-text-3">entities</div>
              </div>
              <div>
                <div className="font-mono text-data-lg text-text-1">{lastUpdated}</div>
                <div className="text-micro uppercase text-text-3">updated</div>
              </div>
              <button
                onClick={() => setTab('Pending')}
                style={pendingCount > 0 ? tintStyle('ember') : undefined}
                className={cn(
                  'rounded-chip border px-3 py-2 text-left transition-opacity hover:opacity-85',
                  pendingCount === 0 && 'border-line-hairline bg-surface-1',
                )}
              >
                <div className={cn('font-mono text-data-lg', pendingCount > 0 ? 'text-ember' : 'text-text-3')}>
                  <Tick value={pendingCount} />
                </div>
                <div className="text-micro uppercase text-text-3">awaiting you</div>
              </button>
            </div>
          </div>
        </div>

        <TeachBar ref={teachRef} onTaught={(t) => { setTaughtText(t); setTab('Pending'); setQuery(''); }} />
      </motion.header>

      {/* ---------- Sections 2 + 3: graph & stream ---------- */}
      <div className="grid grid-cols-12 gap-6">
        <motion.section
          className="col-span-12 xl:col-span-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <EntityGraph tenantId={tenant.id} flashText={taughtText} onOpenStream={openStream} />
        </motion.section>
        <motion.section
          className="col-span-12 xl:col-span-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <FactStream
            tab={tab}
            onTab={setTab}
            query={query}
            onQuery={setQuery}
            highlightId={highlightId}
            onTeach={onTeach}
          />
        </motion.section>
      </div>

      {/* ---------- Section 4: learning feed ---------- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <LearningFeed onFocusFact={focusFact} />
      </motion.div>
    </div>
  );
}
