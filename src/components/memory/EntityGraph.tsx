import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { useTenantFacts } from '@/store';
import type { MemoryFact } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import { tintStyle } from './tints';
import { GRAPHS, NODE_LEGEND, NODE_STYLE } from './graphData';
import type { GraphNode } from './graphData';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING_SNAPPY = { type: 'spring', stiffness: 380, damping: 30 } as const;
const SPRING_PANEL = { type: 'spring', stiffness: 220, damping: 26 } as const;

/** Slow warn pulse on thin-evidence nodes — isolated so re-renders never reset it (§6). */
const WarnPulse = memo(function WarnPulse({ r }: { r: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <circle r={r + 5} fill="none" stroke="var(--warn)" strokeWidth={1} opacity={0.5} />;
  return (
    <motion.circle
      r={r + 5}
      fill="none"
      stroke="var(--warn)"
      strokeWidth={1}
      animate={{ opacity: [0.65, 0.12, 0.65] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
});

/** Idle drift — dedicated memo micro-component so the perpetual loop is isolated. */
const Drift = memo(function Drift({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <g>{children}</g>;
  const dx = 3 + (index % 3);
  const dy = 2 + ((index + 1) % 3);
  return (
    <motion.g
      animate={{ x: [0, dx, 0, -dx, 0], y: [0, -dy, 0, dy, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: index * 1.7 }}
    >
      {children}
    </motion.g>
  );
});

function nodeFacts(node: GraphNode, facts: MemoryFact[]): MemoryFact[] {
  const curated = node.factIds
    .map((id) => facts.find((f) => f.id === id))
    .filter((f): f is MemoryFact => Boolean(f));
  if (curated.length > 0) return curated.slice(0, 3);
  const key = node.label.toLowerCase().split(/[\s–-]/)[0];
  return facts.filter((f) => f.label.toLowerCase().includes(key)).slice(0, 3);
}

export default function EntityGraph({
  tenantId,
  flashText,
  onOpenStream,
}: {
  tenantId: string;
  /** when set, the matching node flashes teal (teach feedback, memory.md §1) */
  flashText: string | null;
  onOpenStream: (tab: string, query?: string) => void;
}) {
  const facts = useTenantFacts();
  const graph = GRAPHS[tenantId] ?? GRAPHS.meridian;
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  // entrance stagger runs once; after that, hover dimming must be immediate
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  // teach feedback: find the node the taught text refers to and flash it teal (600ms)
  useEffect(() => {
    if (!flashText) return;
    const q = flashText.toLowerCase();
    const hit = graph.nodes.find((n) =>
      n.label.toLowerCase().split(/[\s–-]/).some((w) => w.length > 3 && q.includes(w)),
    );
    if (!hit) return;
    const start = setTimeout(() => setFlashId(hit.id), 0);
    const end = setTimeout(() => setFlashId(null), 1200);
    return () => { clearTimeout(start); clearTimeout(end); };
  }, [flashText, graph]);

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const connected = useMemo(() => {
    if (!hoverId) return null;
    const set = new Set<string>([hoverId]);
    graph.edges.forEach((e) => {
      if (e.from === hoverId) set.add(e.to);
      if (e.to === hoverId) set.add(e.from);
    });
    return set;
  }, [hoverId, graph]);

  const tabFor = (n: GraphNode) =>
    n.type === 'lane' ? 'Lanes' : n.type === 'customer' ? 'Customers' : n.type === 'partner' ? 'Partners' : n.type === 'habit' ? 'Habits' : 'All';

  return (
    <div className="relative overflow-hidden rounded-panel border border-line-hairline bg-surface-1">
      {/* faint Signal Field texture behind (8%) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] bg-cover bg-center"
        style={{ backgroundImage: "url('/signal-field-fallback.png')" }}
      />
      {/* header + legend */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-line-hairline px-4 py-3">
        <div className="text-micro uppercase text-text-3">Entity graph · {graph.nodes.length} entities</div>
        <div className="flex flex-wrap items-center gap-3">
          {NODE_LEGEND.filter((l) => graph.nodes.some((n) => n.type === l.type)).map((l) => (
            <span key={l.type} className="flex items-center gap-1.5 text-[10px] text-text-3">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: NODE_STYLE[l.type].stroke }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 760 480" className="relative block h-[480px] w-full select-none">
        {/* edges — draw on mount, stagger 60ms */}
        {graph.edges.map((e, i) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const isConnected = connected?.has(e.from) && connected?.has(e.to);
          return (
            <motion.line
              key={`${e.from}-${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isConnected ? 'var(--teal)' : 'rgba(235,225,205,0.16)'}
              strokeWidth={e.w}
              strokeDasharray={e.dashed ? '4 4' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: connected ? (isConnected ? 0.9 : 0.3) : 0.55,
              }}
              transition={{
                pathLength: { delay: 0.45 + i * 0.06, duration: 0.6, ease: EASE },
                opacity: { duration: 0.2 },
              }}
            />
          );
        })}

        {/* nodes — pop stagger 40ms spring, draggable with spring back */}
        {graph.nodes.map((n, i) => {
          const style = NODE_STYLE[n.type];
          const hovered = hoverId === n.id;
          const dimmed = connected ? !connected.has(n.id) : false;
          const selectedNode = selectedId === n.id;
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: dimmed ? 0.35 : 1 }}
                transition={{
                  scale: { ...SPRING_SNAPPY, delay: entered ? 0 : 0.3 + i * 0.04 },
                  opacity: { duration: 0.2, delay: entered ? 0 : 0.3 + i * 0.04 },
                }}
                whileHover={{ scale: 1.08 }}
                drag
                dragSnapToOrigin
                dragMomentum={false}
                dragElastic={0.25}
                onHoverStart={() => setHoverId(n.id)}
                onHoverEnd={() => setHoverId(null)}
                onTap={() => setSelectedId(n.id)}
                style={{
                  cursor: 'grab',
                  filter:
                    hovered || selectedNode || flashId === n.id
                      ? 'drop-shadow(0 0 12px rgba(47,211,190,0.45))'
                      : undefined,
                }}
              >
                <Drift index={i}>
                  {n.warn && <WarnPulse r={n.r} />}
                  {/* generous hit area */}
                  <circle r={Math.max(n.r + 8, 20)} fill="transparent" />
                  <motion.circle
                    r={n.r}
                    fill={style.fill}
                    stroke={flashId === n.id ? 'var(--teal)' : selectedNode ? 'var(--teal)' : style.stroke}
                    strokeWidth={hovered || selectedNode || flashId === n.id ? 2 : 1.25}
                    strokeDasharray={style.dashed ? '4 3' : undefined}
                    animate={
                      flashId === n.id
                        ? { stroke: ['var(--teal)', style.stroke, 'var(--teal)'] }
                        : undefined
                    }
                    transition={flashId === n.id ? { duration: 1.2 } : undefined}
                  />
                  <text
                    y={n.r + 14}
                    textAnchor="middle"
                    fill={hovered || selectedNode ? 'var(--text-1)' : 'var(--text-2)'}
                    style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500, pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                  {n.type === 'lane' && (
                    <text
                      y={4}
                      textAnchor="middle"
                      fill="var(--ember)"
                      style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', pointerEvents: 'none' }}
                    >
                      {n.factIds.length > 0 ? `${nodeFacts(n, facts).length}◈` : ''}
                    </text>
                  )}
                </Drift>
              </motion.g>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] text-text-3">
        hover to trace · click to inspect · drag to play
      </div>

      {/* node detail mini-panel (spring-panel) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={SPRING_PANEL}
            className="glass absolute bottom-3 right-3 top-14 z-10 w-60 overflow-y-auto rounded-card border border-line-strong p-4 shadow-modal"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-h3 text-text-1">{selected.label}</div>
                <div className="mt-0.5 text-micro uppercase text-text-3">{selected.type}</div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-text-3 transition-colors hover:text-text-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {selected.warn && (
              <div
                style={tintStyle('warn')}
                className="mt-3 rounded-chip border px-2.5 py-2 text-caption text-warn"
              >
                Thin evidence — I’ll ask before assuming anything here.
              </div>
            )}
            <div className="mt-3 space-y-2">
              {nodeFacts(selected, facts).map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-chip border border-line-hairline bg-surface-2 px-2.5 py-2">
                  <ConfidenceRing value={f.confidence} size={22} showLabel />
                  <span className="min-w-0 flex-1 truncate text-caption text-text-2">{f.label}</span>
                </div>
              ))}
              {nodeFacts(selected, facts).length === 0 && (
                <p className="text-caption text-text-3">No facts linked yet — teach me about {selected.label} below.</p>
              )}
            </div>
            <button
              onClick={() => { onOpenStream(tabFor(selected), selected.streamQuery); setSelectedId(null); }}
              style={tintStyle('teal')}
              className={cn(
                'mt-3 flex w-full items-center justify-center gap-1.5 rounded-chip border',
                'px-3 py-1.5 text-caption font-medium text-teal transition-opacity hover:opacity-80',
              )}
            >
              Open in stream <ArrowRight className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
