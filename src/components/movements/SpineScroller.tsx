// Movement Spine — vertical, scroll-scrubbed timeline (design.md §9.7, movements.md §B2).
// GSAP ScrollTrigger (scoped to this scroll panel) draws the progress line with scroll
// (scrub 0.5); nodes activate as the draw reaches them. This component is a GSAP-only
// island: no framer-motion inside (library isolation). Node cards expand with CSS
// transitions (240ms); tier toggles remount it and the spine redraws in 600ms.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, FileText, ShieldAlert } from 'lucide-react';
import type { ApprovalAction, BorderCrossing, Leg, Movement } from '@/store';
import { fmtMoney } from '@/store';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

// ---------- spine model ----------

type NodeKind = 'origin' | 'destination' | 'milestone' | 'border' | 'handoff';

interface SpineNode {
  kind: NodeKind;
  label: string;
  sub?: string;
  time: string;
  status: 'done' | 'current' | 'upcoming';
  border?: BorderCrossing;
  partner?: string;
}

type Item =
  | { key: string; type: 'node'; node: SpineNode }
  | { key: string; type: 'leg'; leg: Leg };

function buildItems(m: Movement, simple: boolean): Item[] {
  const fromLc = m.from.toLowerCase();
  const toLc = m.to.toLowerCase();
  const ms = m.milestones;

  const originIdx = Math.max(0, ms.findIndex((x) => x.label.toLowerCase().includes(fromLc)));
  let destIdx = -1;
  ms.forEach((x, i) => {
    if (x.label.toLowerCase().includes(toLc)) destIdx = i;
  });
  if (destIdx < 0) destIdx = ms.length - 1;

  const usedBorders = new Map<string, number>();
  const raw: { node: SpineNode; msLabel: string }[] = [];

  ms.forEach((x, i) => {
    const labelLc = x.label.toLowerCase();
    const border = m.borders.find((b) => labelLc.includes(b.name.toLowerCase()));
    if (border) {
      const prev = usedBorders.get(border.id);
      const node: SpineNode = {
        kind: 'border',
        label: `Border — ${border.name} (${border.fromCountry}/${border.toCountry})`,
        sub: border.status === 'waiting' ? 'border crossing · waiting' : border.status === 'cleared' ? 'border cleared' : 'border crossing · upcoming',
        time: x.time,
        status: x.status,
        border,
      };
      if (prev !== undefined) {
        // second milestone at the same border (e.g. "Clear Malaba") updates the node
        raw[prev] = { node, msLabel: x.label };
      } else {
        usedBorders.set(border.id, raw.length);
        raw.push({ node, msLabel: x.label });
      }
      return;
    }
    if (/handoff/i.test(x.label)) {
      const partnerLeg = m.legs.find((l) => l.partnerName);
      raw.push({
        node: {
          kind: 'handoff',
          label: `Handoff — ${partnerLeg?.from ?? x.label.replace(/handoff/iu, '').replace(/[·-]/g, '').trim()}`,
          sub: 'responsibility transfer',
          time: x.time,
          status: x.status,
          partner: partnerLeg?.partnerName,
        },
        msLabel: x.label,
      });
      return;
    }
    if (i === originIdx) {
      raw.push({ node: { kind: 'origin', label: `Origin — ${m.from}`, sub: `${m.cargo} loaded`, time: x.time, status: x.status }, msLabel: x.label });
      return;
    }
    if (i === destIdx) {
      raw.push({ node: { kind: 'destination', label: `Destination — ${m.to}`, sub: 'consignee delivery', time: x.time, status: x.status }, msLabel: x.label });
      return;
    }
    raw.push({ node: { kind: 'milestone', label: x.label, time: x.time, status: x.status }, msLabel: x.label });
  });

  if (simple) {
    const origin = raw.find((r) => r.node.kind === 'origin');
    const dest = raw.find((r) => r.node.kind === 'destination');
    const current = raw.find((r) => r.node.status === 'current' && r.node.kind === 'milestone');
    const items: Item[] = [];
    if (origin) items.push({ key: 'n-origin', type: 'node', node: { ...origin.node, label: `Pickup — ${m.from}` } });
    if (current) items.push({ key: 'n-current', type: 'node', node: current.node });
    if (dest) items.push({ key: 'n-dest', type: 'node', node: { ...dest.node, label: `Drop — ${m.to}` } });
    return items;
  }

  // interleave leg segments before the node whose label contains leg.to
  const items: Item[] = [];
  const placedLegs = new Set<string>();
  raw.forEach((r, i) => {
    m.legs.forEach((leg) => {
      if (placedLegs.has(leg.id)) return;
      if (r.msLabel.toLowerCase().includes(leg.to.toLowerCase()) || r.node.label.toLowerCase().includes(leg.to.toLowerCase())) {
        items.push({ key: `leg-${leg.id}`, type: 'leg', leg });
        placedLegs.add(leg.id);
      }
    });
    items.push({ key: `n-${i}`, type: 'node', node: r.node });
  });
  // legs never matched by destination city (e.g. mid-route legs): place them
  // just after the node containing their origin city
  m.legs.forEach((leg) => {
    if (placedLegs.has(leg.id)) return;
    const idx = items.findIndex(
      (it) => it.type === 'node' && it.node.label.toLowerCase().includes(leg.from.toLowerCase()),
    );
    items.splice(idx >= 0 ? idx + 1 : Math.max(0, items.length - 1), 0, { key: `leg-${leg.id}`, type: 'leg', leg });
  });
  return items;
}

// ---------- component ----------

export default function SpineScroller({
  movement,
  simple,
  className,
  pendingException,
  onExceptionClick,
  onOpenDossier,
}: {
  movement: Movement;
  simple: boolean;
  className?: string;
  pendingException?: ApprovalAction;
  onExceptionClick?: (pos: { x: number; y: number }) => void;
  onOpenDossier?: (border: BorderCrossing) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const items = buildItems(movement, simple);
  const nodeIndexes = items.map((it, i) => (it.type === 'node' ? i : -1)).filter((i) => i >= 0);

  // GSAP scrub: progress line draws with scroll; nodes activate as the draw reaches them.
  useEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    const line = lineRef.current;
    if (!panel || !content || !line) return;

    const ctx = gsap.context(() => {
      const apply = (p: number) => {
        const total = content.scrollHeight;
        nodeRefs.current.forEach((el) => {
          if (!el) return;
          const on = p * total >= el.offsetTop - 24;
          const dot = el.querySelector('[data-dot]');
          const label = el.querySelector('[data-label]:not([data-tone])');
          if (dot) {
            dot.classList.toggle('scale-100', on);
            dot.classList.toggle('opacity-100', on);
            dot.classList.toggle('scale-0', !on);
            dot.classList.toggle('opacity-0', !on);
          }
          if (label) {
            label.classList.toggle('text-text-1', on);
            label.classList.toggle('text-text-3', !on);
          }
        });
      };

      gsap.set(line, { scaleY: 0, transformOrigin: 'top center' });
      gsap.to(line, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: content,
          scroller: panel,
          start: 'top 80%',
          end: 'bottom bottom-=140',
          scrub: 0.5,
          onUpdate: (self) => apply(self.progress),
          onRefresh: (self) => apply(self.progress),
        },
      });

      // spine redraws on (re)mount — 600ms materialize of the panel content
      gsap.fromTo(
        content,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' },
      );
    }, panel);

    return () => ctx.revert();
  }, [movement.id, simple, movement.docs]);

  // expanding a node changes scroll geometry — refresh triggers after the CSS transition
  const toggleOpen = (key: string) => {
    setOpenKey((k) => (k === key ? null : key));
    window.setTimeout(() => ScrollTrigger.refresh(), 280);
  };

  const [docsDone, docsTotal] = [
    movement.docs.filter((d) => d.status === 'verified').length,
    movement.docs.length,
  ];

  return (
    <div
      ref={panelRef}
      className={cn('relative overflow-y-auto rounded-panel border border-line-hairline bg-surface-1', className)}
    >
      <div ref={contentRef} className="relative px-5 pt-5">
        {/* track + scrubbed progress line */}
        <div
          className="absolute bottom-8 left-[31px] top-7 w-px"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, var(--line-strong) 0 4px, transparent 4px 9px)',
          }}
        />
        <div
          ref={lineRef}
          className="absolute bottom-8 left-[31px] top-7 w-px"
          style={{ background: 'linear-gradient(to bottom, var(--teal), var(--ember))' }}
        />

        {items.map((it, i) => {
          if (it.type === 'leg') {
            const leg = it.leg;
            return (
              <div key={it.key} className="relative mb-2 ml-9 mr-1">
                <button
                  onClick={() => toggleOpen(it.key)}
                  className="w-full rounded-card border border-line-hairline bg-surface-2/60 px-3 py-2 text-left transition-colors duration-150 hover:border-line-strong"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption text-text-2">
                      Leg {leg.seq} — {leg.from} <span className="text-text-3">→</span> {leg.to}
                      {leg.distanceKm !== undefined && (
                        <span className="font-mono text-[11px] text-text-3"> · {leg.distanceKm} km</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'rounded-chip border px-1.5 py-px font-mono text-[10px]',
                        leg.status === 'done' && 'border-ok/30 bg-ok/10 text-ok',
                        leg.status === 'active' && 'border-ember/30 bg-ember-dim text-ember',
                        leg.status === 'planned' && 'border-line-strong text-text-3 border-dashed',
                      )}
                    >
                      {leg.status === 'done' ? '✓ complete' : leg.status === 'active' ? 'en route' : 'planned'}
                    </span>
                  </div>
                  {/* mini route line + live eta chip */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="relative h-px flex-1 bg-line-strong">
                      <span
                        className={cn(
                          'absolute -top-[2px] h-[5px] w-[5px] rounded-full',
                          leg.status === 'done' && 'right-0 bg-ok',
                          leg.status === 'active' && 'left-1/2 bg-ember animate-pulse-dot',
                          leg.status === 'planned' && 'left-0 bg-text-3',
                        )}
                      />
                    </span>
                    <span className="font-mono text-[10px] text-text-3">
                      {leg.vehiclePlate ?? leg.partnerName ?? 'unassigned'}
                    </span>
                  </div>
                </button>
                <div
                  className="grid transition-all duration-200 ease-out-expo"
                  style={{ gridTemplateRows: openKey === it.key ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="mt-1.5 space-y-1 rounded-card border border-line-hairline bg-surface-2 p-3 text-caption text-text-2">
                      {leg.vehiclePlate && <div>Vehicle <span className="font-mono text-text-1">{leg.vehiclePlate}</span></div>}
                      {leg.driverName && <div>Driver <span className="text-text-1">{leg.driverName}</span></div>}
                      {leg.partnerName && <div>Partner <span className="text-teal">{leg.partnerName}</span></div>}
                      <div className="text-text-3">Mode {leg.mode === 'road-ftl' ? 'Road · FTL' : 'Road · LTL'}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const n = it.node;
          return (
            <div
              key={it.key}
              ref={(el) => {
                if (nodeIndexes.includes(i)) nodeRefs.current[i] = el;
              }}
              className="relative mb-2"
            >
              {/* node dot (activated by GSAP scrub via class toggles) */}
              <span
                data-dot
                className={cn(
                  'absolute left-[4px] top-2.5 block h-[15px] w-[15px] scale-0 opacity-0 transition-all duration-300 ease-out-expo',
                  n.kind === 'border'
                    ? cn(
                        'rotate-45 border-2 border-warn',
                        n.status === 'current' ? 'bg-warn/30 shadow-[0_0_16px_rgba(240,180,41,0.4)]' : n.status === 'done' ? 'bg-warn' : 'bg-canvas',
                      )
                    : n.kind === 'handoff'
                      ? 'rounded-full border-2 border-teal bg-canvas'
                      : cn(
                          'rounded-full border-2',
                          n.status === 'done' && 'border-ember bg-ember',
                          n.status === 'current' && 'border-ember bg-canvas shadow-glow-ember',
                          n.status === 'upcoming' && 'border-line-strong bg-canvas',
                          (n.kind === 'origin' || n.kind === 'destination') && 'h-[17px] w-[17px] -translate-x-[1px]',
                        ),
                )}
              >
                {n.kind === 'handoff' && <span className="absolute inset-[3px] rounded-full border border-teal" />}
              </span>

              <div className="ml-9 mr-1">
                <button onClick={() => toggleOpen(it.key)} className="w-full py-1 text-left">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      data-label
                      {...(n.kind === 'border' || n.kind === 'handoff' ? { 'data-tone': true } : {})}
                      className={cn(
                        'text-small transition-colors duration-300',
                        n.kind === 'border' && 'text-warn',
                        n.kind === 'handoff' && 'text-teal',
                      )}
                    >
                      {n.label}
                    </span>
                    <span className="shrink-0 font-mono text-data text-text-3">{n.time}</span>
                  </div>
                  {n.sub && (
                    <div className={cn('text-caption', n.kind === 'border' ? 'text-warn/80' : n.kind === 'handoff' ? 'text-teal/80' : 'text-text-3')}>
                      {n.sub}
                    </div>
                  )}
                </button>

                {/* border dossier preview + live wait + exception chip */}
                {n.kind === 'border' && n.border && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-chip border border-line-hairline bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-2">
                      <FileText className="h-3 w-3 text-text-3" />
                      dossier {docsDone}/{docsTotal}
                    </span>
                    {n.border.status === 'waiting' && n.border.waitHours !== undefined && (
                      <span className="inline-flex items-center gap-1.5 rounded-chip border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">
                        wait {n.border.waitHours}h
                        {n.border.avgHours !== undefined && (
                          <span className="text-teal">
                            ◈ your avg {n.border.avgHours}h{n.border.trend === 'down' ? ' · trending down' : ''}
                          </span>
                        )}
                      </span>
                    )}
                    {n.border.status === 'upcoming' && n.border.avgHours !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-chip border border-teal/25 bg-teal-dim px-2 py-0.5 font-mono text-[11px] text-teal">
                        predicted wait {n.border.avgHours}h · ◈ partner data
                      </span>
                    )}
                    {n.border.status === 'cleared' && n.border.waitHours !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-chip border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[11px] text-ok">
                        cleared in {n.border.waitHours}h
                      </span>
                    )}
                    {pendingException && n.border.status === 'waiting' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExceptionClick?.({ x: e.clientX, y: e.clientY });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-chip border border-danger/40 bg-danger/10 px-2 py-0.5 text-caption text-danger transition-colors hover:bg-danger/20"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        {movement.exceptionNote ?? pendingException.context}
                        <span className="rounded bg-ember px-1.5 py-px font-mono text-[10px] text-canvas">
                          Approve renewal {pendingException.amount ? fmtMoney(pendingException.amount) : ''}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* expandable node card */}
                <div
                  className="grid transition-all duration-200 ease-out-expo"
                  style={{ gridTemplateRows: openKey === it.key ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="mt-1.5 space-y-1.5 rounded-card border border-line-hairline bg-surface-2 p-3 text-caption text-text-2">
                      {n.kind === 'origin' && (
                        <>
                          <div>Cargo <span className="text-text-1">{movement.cargo}</span></div>
                          {movement.id === 'MR-2481' && (
                            <div className="text-ok">weighbridge 12.18t ✓ <span className="text-text-3">(tare verified)</span></div>
                          )}
                          <div className="text-text-3">Timestamp <span className="font-mono">{n.time}</span></div>
                        </>
                      )}
                      {n.kind === 'destination' && (
                        <>
                          <div>
                            Consignee{' '}
                            <span className="text-text-1">
                              {movement.parties.find((p) => p.role === 'consignee')?.name ?? movement.customer}
                            </span>
                          </div>
                          {movement.id === 'MR-2481' && (
                            <div className="text-teal">POD required · ◈ Bidco requires POD &lt; 24h</div>
                          )}
                        </>
                      )}
                      {n.kind === 'border' && n.border && (
                        <>
                          <div>
                            Dossier <span className="font-mono text-text-1">{docsDone}/{docsTotal} docs verified</span>
                            {n.border.status === 'upcoming' && <span className="text-ok"> · pre-checked ✓</span>}
                          </div>
                          {onOpenDossier && (
                            <button
                              onClick={() => onOpenDossier(n.border!)}
                              className="inline-flex items-center gap-1 text-teal transition-colors hover:text-text-1"
                            >
                              Open dossier <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                      {n.kind === 'handoff' && (
                        <>
                          {n.partner && (
                            <div>
                              Responsibility transfer: <span className="text-text-1">Meridian</span>
                              <span className="text-text-3"> → </span>
                              <span className="text-teal">{n.partner}</span>
                              {movement.id === 'MR-2481' && <span className="text-teal"> · trust 91 ◈</span>}
                            </div>
                          )}
                          {movement.id === 'MR-2481' && (
                            <div className="text-text-3">trailer swap · 4 docs countersign · est. dwell 3h</div>
                          )}
                        </>
                      )}
                      {n.kind === 'milestone' && (
                        <div className="text-text-3">
                          {n.status === 'current' ? 'In progress now' : n.status === 'done' ? `Completed ${n.time}` : `Expected ${n.time}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* scroll room so the scrub has travel */}
        <div style={{ height: '38dvh' }} />
      </div>
    </div>
  );
}
