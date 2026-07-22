import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, animate, motion } from 'framer-motion';
import ProgressRail from '@/components/onboarding/ProgressRail';
import SignalField from '@/components/onboarding/SignalField';
import StepWelcome from '@/components/onboarding/StepWelcome';
import StepIdentity from '@/components/onboarding/StepIdentity';
import StepMemory from '@/components/onboarding/StepMemory';
import StepInterview from '@/components/onboarding/StepInterview';
import StepReveal from '@/components/onboarding/StepReveal';
import StepAutonomy from '@/components/onboarding/StepAutonomy';
import { EASE_OUT_EXPO, EASE_STANDARD } from '@/components/onboarding/types';
import type { IdentityState, SignalControl } from '@/components/onboarding/types';
import { useStore } from '@/store';
import type { FactKind } from '@/store';

/** Field energy per wizard step — step 0 sparse drift, step 5 fully charged. */
const STEP_ENERGY = [0, 0.25, 0.4, 0.6, 0.9, 1];

/** Facts the "Explore with sample data" path seeds into Business Memory. */
const SAMPLE_FACTS: { label: string; kind: FactKind }[] = [
  { label: 'Mombasa→Kigali · FTL · $4,100 avg', kind: 'lane' },
  { label: 'Bidco Africa · net-30 · morning pickups', kind: 'customer' },
  { label: 'Never quote below cost + 12%.', kind: 'rule' },
  { label: 'Rwanda Link Logistics — subcontractor, Kigali', kind: 'partner' },
  { label: 'Lane flat pricing', kind: 'pricing' },
];

/**
 * Genesis — the chrome-less setup wizard where the living model of the business
 * visibly comes alive (onboarding.md). Steps:
 * 0 Welcome · 1 Identity · 2 Feed the Memory · 3 Interview · 4 Model Reveal · 5 Autonomy
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const teachFact = useStore((s) => s.teachFact);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [factsLanded, setFactsLanded] = useState(0);
  const [identity, setIdentity] = useState<IdentityState>({
    name: '',
    ops: [],
    countries: [],
    fleet: null,
  });
  const control = useRef<SignalControl>({ energy: 0, converge: 0, scatter: 0 });
  const energyAnim = useRef<ReturnType<typeof animate> | null>(null);
  const sampleSeeded = useRef(false);

  // Signal Field energy follows wizard progress (+ extraction density on step 2)
  useEffect(() => {
    const base = STEP_ENERGY[step] ?? 0;
    const target = step === 2 ? base + Math.min(1, factsLanded / 5) * 0.25 : base;
    energyAnim.current?.stop();
    energyAnim.current = animate(control.current.energy, target, {
      duration: 1,
      ease: 'easeOut',
      onUpdate: (v) => {
        control.current.energy = v;
      },
    });
  }, [step, factsLanded]);

  const handleSample = () => {
    if (!sampleSeeded.current) {
      sampleSeeded.current = true;
      SAMPLE_FACTS.forEach((f) => teachFact(f));
    }
    setIdentity({
      name: 'Meridian Freight',
      ops: ['Freight forwarder'],
      countries: ['Kenya', 'Uganda', 'Rwanda'],
      fleet: '6–20',
    });
    setStep(4); // jump straight to the Model Reveal
  };

  const handleEnter = () => {
    if (exiting) return;
    setExiting(true);
    // Signal Field particles scatter outward (600ms), canvas fades → /today
    animate(control.current.scatter, 1, {
      duration: 0.6,
      ease: 'easeIn',
      onUpdate: (v) => {
        control.current.scatter = v;
      },
    });
    window.setTimeout(() => navigate('/today'), 620);
  };

  return (
    <div className="grain relative min-h-[100dvh] overflow-x-clip bg-canvas">
      <SignalField control={control} />

      {/* Fraytline mark, top-left, 60% opacity */}
      <img src="/logo.svg" alt="Fraytline" className="fixed left-6 top-6 z-30 h-6 w-auto opacity-60" />

      {step >= 1 && <ProgressRail step={step} />}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } }}
          exit={{ opacity: 0, y: -24, transition: { duration: 0.25, ease: EASE_STANDARD } }}
        >
          {step === 0 && <StepWelcome onBegin={() => setStep(1)} onSample={handleSample} />}
          {step === 1 && (
            <StepIdentity
              identity={identity}
              onChange={(patch) => setIdentity((s) => ({ ...s, ...patch }))}
              onContinue={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepMemory
              onFactLanded={() => setFactsLanded((n) => n + 1)}
              onContinue={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && <StepInterview onDone={() => setStep(4)} />}
          {step === 4 && <StepReveal control={control} onNext={() => setStep(5)} />}
          {step === 5 && <StepAutonomy onEnter={handleEnter} />}
        </motion.div>
      </AnimatePresence>

      {/* exit veil — canvas fades as the field scatters */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-40 bg-canvas"
        initial={false}
        animate={{ opacity: exiting ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeIn' }}
      />
    </div>
  );
}
