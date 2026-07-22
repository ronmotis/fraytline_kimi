import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Handshake, MapPin, ScrollText, Truck, Users, X } from 'lucide-react';
import MemoryChip from '@/components/MemoryChip';
import type { FactSource } from '@/store';
import type { SignalControl } from './types';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

interface Cluster {
  label: string;
  icon: typeof MapPin;
  /** [left%, top%] of the loose ring */
  pos: [number, number];
  target: number;
  format?: (v: number) => string;
  sub?: string;
  highlight?: string;
  facts: { label: string; confidence: number; source: FactSource }[];
}

const CLUSTERS: Cluster[] = [
  {
    label: 'Lanes', icon: MapPin, pos: [22, 20], target: 12,
    facts: [
      { label: 'Nairobi→Kampala avg $1,850', confidence: 94, source: 'document' },
      { label: 'Mombasa→Kigali avg $4,100', confidence: 89, source: 'document' },
      { label: 'Nairobi→Juba — only 2 moves', confidence: 41, source: 'document' },
    ],
  },
  {
    label: 'Customers', icon: Users, pos: [78, 18], target: 8,
    facts: [
      { label: 'Bidco prefers morning pickups', confidence: 92, source: 'behavior' },
      { label: 'Bidco Africa · net-30', confidence: 86, source: 'document' },
      { label: 'Twiga Foods · weekly cadence', confidence: 81, source: 'behavior' },
    ],
  },
  {
    label: 'Fleet & drivers', icon: Truck, pos: [12, 55], target: 1,
    format: (v) => `${Math.round(v * 14)} / ${Math.round(v * 18)}`,
    sub: 'vehicles / drivers',
    facts: [
      { label: '14 vehicles · 4 Volvo FH', confidence: 97, source: 'document' },
      { label: 'KDM 930B service due 5 days', confidence: 90, source: 'behavior' },
      { label: 'KDJ 482T · Joseph Kiprop', confidence: 95, source: 'document' },
    ],
  },
  {
    label: 'Partners', icon: Handshake, pos: [88, 52], target: 5, highlight: 'Rwanda Link',
    facts: [
      { label: 'Rwanda Link · on-time 96%', confidence: 91, source: 'behavior' },
      { label: 'Docs complete 100%', confidence: 91, source: 'behavior' },
      { label: '12 handoffs · Kigali corridor', confidence: 88, source: 'document' },
    ],
  },
  {
    label: 'Rules & habits', icon: ScrollText, pos: [20, 84], target: 23,
    facts: [
      { label: 'Never quote below cost + 12%', confidence: 100, source: 'you' },
      { label: 'Avoids Sunday departures', confidence: 76, source: 'behavior' },
      { label: 'Prefer Busia over Malaba', confidence: 88, source: 'behavior' },
    ],
  },
];

const HEADLINE = 'This is yours now.';
const RING_R = 29;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Step 4 — Model Reveal ("Your business, understood").
 * Section pins for 150vh; scroll progress (GSAP ScrollTrigger, scrub 0.5) drives assembly:
 * converge → 5 entity clusters draw in → core forms → health ring → headline.
 */
export default function StepReveal({
  control,
  onNext,
}: {
  control: RefObject<SignalControl>;
  onNext: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const bordersRef = useRef<(SVGRectElement | null)[]>([]);
  const countsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const edgesRef = useRef<(SVGLineElement | null)[]>([]);
  const coreRef = useRef<HTMLDivElement>(null);
  const ringWrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const ringLabelRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctrl = control.current;
    if (ctrl) ctrl.converge = 1;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];
      const borders = bordersRef.current.filter(Boolean) as SVGRectElement[];
      const edges = edgesRef.current.filter(Boolean) as SVGLineElement[];
      const chars = headlineRef.current
        ? Array.from(headlineRef.current.querySelectorAll('.reveal-char'))
        : [];

      gsap.set(cards, { autoAlpha: 0, y: 24, scale: 0.94 });
      gsap.set(borders, { strokeDashoffset: 100 });
      gsap.set(edges, { strokeDashoffset: 100 });
      gsap.set(coreRef.current, { autoAlpha: 0, scale: 0.8 });
      gsap.set(ringWrapRef.current, { autoAlpha: 0 });
      gsap.set(ringRef.current, { strokeDashoffset: RING_C });
      gsap.set(captionRef.current, { autoAlpha: 0, y: 8 });
      gsap.set(chars, { autoAlpha: 0, y: 12 });
      gsap.set(subRef.current, { autoAlpha: 0 });
      gsap.set(ctaRef.current, { autoAlpha: 0, y: 16 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=150%',
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            // 0.0–0.2: field accelerates then converges toward cluster targets
            if (ctrl) ctrl.converge = Math.min(1, self.progress / 0.2);
          },
        },
      });

      // 0.2–0.5: cluster cards materialize + borders draw + numerals tick
      tl.to(cards, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.045, duration: 0.2, ease: 'power2.out' }, 0.2)
        .to(borders, { strokeDashoffset: 0, stagger: 0.045, duration: 0.2, ease: 'power2.out' }, 0.2);
      CLUSTERS.forEach((c, i) => {
        const el = countsRef.current[i];
        if (!el) return;
        const proxy = { v: 0 };
        tl.to(
          proxy,
          {
            v: 1,
            duration: 0.18,
            ease: 'power1.out',
            onUpdate: () => {
              el.textContent = c.format ? c.format(proxy.v) : String(Math.round(proxy.v * c.target));
            },
          },
          0.22 + i * 0.045,
        );
      });
      // hairline edges connect clusters (600ms equivalents)
      tl.to(edges, { strokeDashoffset: 0, stagger: 0.03, duration: 0.18, ease: 'power1.inOut' }, 0.32)
        // 0.5–0.7: the core forms
        .to(coreRef.current, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'back.out(1.5)' }, 0.5)
        // 0.7–0.85: model health ring + honest caption
        .to(ringWrapRef.current, { autoAlpha: 1, duration: 0.06 }, 0.69)
        .to(ringRef.current, { strokeDashoffset: RING_C * (1 - 0.87), duration: 0.13, ease: 'power1.inOut' }, 0.7);
      const ringProxy = { v: 0 };
      tl.to(
        ringProxy,
        {
          v: 87,
          duration: 0.13,
          ease: 'power1.out',
          onUpdate: () => {
            if (ringLabelRef.current) ringLabelRef.current.textContent = String(Math.round(ringProxy.v));
          },
        },
        0.7,
      )
        .to(captionRef.current, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.76)
        // 0.85–1.0: headline + sub + CTA
        .to(chars, { autoAlpha: 1, y: 0, stagger: 0.006, duration: 0.08, ease: 'power2.out' }, 0.85)
        .to(subRef.current, { autoAlpha: 1, duration: 0.06 }, 0.93)
        .to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.95);
    }, rootRef);

    return () => {
      ctx.revert();
      if (ctrl) ctrl.converge = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="relative z-10">
      <section
        ref={sectionRef}
        className="relative flex h-[100dvh] items-center justify-center overflow-hidden"
      >
        {/* hairline edges — mini constellation of the business */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {CLUSTERS.map((c, i) => (
            <line
              key={c.label}
              ref={(el) => {
                edgesRef.current[i] = el;
              }}
              x1={c.pos[0]}
              y1={c.pos[1]}
              x2={50}
              y2={42}
              stroke="var(--teal)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
              style={{
                opacity: hovered === null ? 0.4 : hovered === i ? 0.9 : 0.12,
                transition: 'opacity 300ms',
              }}
            />
          ))}
        </svg>

        {/* entity cluster cards */}
        {CLUSTERS.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              className="absolute w-[180px]"
              style={{ left: `${c.pos[0]}%`, top: `${c.pos[1]}%`, transform: 'translate(-50%,-50%)' }}
            >
              <div
                className={cn(
                  'relative cursor-pointer rounded-card bg-surface-1/90 p-4 backdrop-blur-sm',
                  'transition-transform duration-300 ease-out-expo',
                  hovered === i && '-translate-y-1 shadow-glow-teal',
                )}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {/* self-drawing border */}
                <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <rect
                    ref={(el) => {
                      bordersRef.current[i] = el;
                    }}
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="10"
                    fill="none"
                    stroke="rgba(235,225,205,0.22)"
                    strokeWidth="1"
                    pathLength={100}
                    strokeDasharray={100}
                    strokeDashoffset={100}
                  />
                </svg>
                <div className="flex items-center gap-2 text-text-3">
                  <Icon className="h-3.5 w-3.5 text-teal" />
                  <span className="text-micro uppercase">{c.label}</span>
                </div>
                <div className="mt-2 font-mono text-data-lg text-text-1">
                  <span
                    ref={(el) => {
                      countsRef.current[i] = el;
                    }}
                  >
                    {c.format ? c.format(1) : c.target}
                  </span>
                  {c.sub && <span className="ml-2 text-[10px] font-sans text-text-3">{c.sub}</span>}
                </div>
                {c.highlight && (
                  <div className="mt-1 text-[10px] text-teal">◈ {c.highlight}</div>
                )}
              </div>

              {/* click → preview popover with sample facts */}
              {open === i && (
                <div className="glass absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-card border border-line-strong p-3 shadow-modal">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-micro uppercase text-text-3">Sample facts</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(null);
                      }}
                      className="text-text-3 hover:text-text-1"
                      aria-label="Close"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-1.5">
                    {c.facts.map((f) => (
                      <MemoryChip
                        key={f.label}
                        label={f.label}
                        confidence={f.confidence}
                        source={f.source}
                        evidence={['extracted during Genesis']}
                        evidenceCount={1}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* core — The Operator Model */}
        <div
          ref={coreRef}
          className="living-border glass absolute left-1/2 top-[42%] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-panel p-6 text-center"
        >
          <p className="text-micro uppercase text-teal">The Operator Model · v1</p>
          <p className="mt-2 font-display text-h2 text-text-1">Meridian Freight</p>
          <p className="mt-1 text-small text-text-2">
            A living model of your business. It updates every time you work.
          </p>
        </div>

        {/* model health ring + honest caption */}
        <div
          ref={ringWrapRef}
          className="absolute left-1/2 top-[56%] flex -translate-x-1/2 flex-col items-center"
        >
          <span className="relative inline-flex items-center justify-center" style={{ width: 64, height: 64 }}>
            <svg width="64" height="64" className="-rotate-90">
              <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--line-hairline)" strokeWidth="4" />
              <circle
                ref={ringRef}
                cx="32"
                cy="32"
                r={RING_R}
                fill="none"
                stroke="var(--teal)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - 0.87)}
              />
            </svg>
            <span ref={ringLabelRef} className="absolute font-mono text-[13px] font-semibold text-teal">
              87
            </span>
          </span>
          <p ref={captionRef} className="mt-2 max-w-[300px] text-center text-caption text-text-2">
            Strong on Nairobi–Kampala. Thin on Juba — I'll ask before I assume there.
          </p>
        </div>

        {/* headline + sub + CTA */}
        <div className="absolute bottom-[6%] left-1/2 flex w-full -translate-x-1/2 flex-col items-center px-6">
          <div ref={headlineRef} className="font-display text-display text-text-1">
            {HEADLINE.split('').map((ch, i) => (
              <span key={i} className="reveal-char inline-block">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </div>
          <p ref={subRef} className="mt-2 text-body text-text-2">
            Correct me anytime. Every correction makes the next decision better.
          </p>
          <div ref={ctaRef} className="mt-5">
            <button
              onClick={onNext}
              className="rounded-chip bg-ember px-6 py-2.5 text-body-strong text-canvas transition-all duration-150 hover:-translate-y-px hover:bg-ember-hi"
            >
              Set my autonomy →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
