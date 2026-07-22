import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, Handshake, Plus, Radio, Truck } from 'lucide-react';
import { EASE_OUT_EXPO, SPRING_SNAPPY } from './types';
import type { IdentityState } from './types';
import { cn } from '@/lib/utils';

const OPS = [
  { label: 'Trucking operator', icon: Truck },
  { label: 'Freight forwarder', icon: Boxes },
  { label: 'Dispatcher', icon: Radio },
  { label: 'Broker', icon: Handshake },
];
const COUNTRIES = ['Kenya', 'Uganda', 'Rwanda', 'Tanzania', 'Ghana'];
const FLEET = ['1–5', '6–20', '21–50', '50+'];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_EXPO, delay: i * 0.09 },
  }),
};

function SelectChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={SPRING_SNAPPY}
      className={cn(
        'flex items-center gap-2 rounded-chip border px-3.5 py-2 text-small transition-colors duration-150',
        selected
          ? 'border-ember bg-ember-dim text-text-1'
          : 'border-line-strong text-text-2 hover:border-text-3 hover:text-text-1',
      )}
    >
      {children}
    </motion.button>
  );
}

/** Step 1 — Identity ("Who are we learning?") — two-column 60/40 with live preview panel. */
export default function StepIdentity({
  identity,
  onChange,
  onContinue,
}: {
  identity: IdentityState;
  onChange: (patch: Partial<IdentityState>) => void;
  onContinue: () => void;
}) {
  const [addingCountry, setAddingCountry] = useState(false);
  const [countryDraft, setCountryDraft] = useState('');
  const [burst, setBurst] = useState(false);
  const burstTimer = useRef<number | null>(null);

  // Living Border burst (500ms) on the preview panel after every change
  const change = (patch: Partial<IdentityState>) => {
    onChange(patch);
    setBurst(true);
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(false), 500);
  };

  useEffect(
    () => () => {
      if (burstTimer.current) window.clearTimeout(burstTimer.current);
    },
    [],
  );

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const lines: string[] = [];
  if (identity.name.trim())
    lines.push(`“${identity.name.trim()}” — this becomes your mark, your ledger, your model.`);
  if (identity.ops.length > 0)
    lines.push(
      `${identity.ops.join(' + ')}${identity.fleet ? ` + ${identity.fleet} trucks` : ''} → I'll surface quotes, dispatch, and partner tools first.`,
    );
  else if (identity.fleet)
    lines.push(`${identity.fleet} trucks → dispatch board and fleet tools come first.`);
  if (identity.countries.length >= 2)
    lines.push(
      `${identity.countries.join(' + ')} → border dossiers, EAC bonds, and multi-currency (KES · UGX · RWF · USD) are ready when you need them. Hidden until then.`,
    );
  else if (identity.countries.length === 1)
    lines.push(`${identity.countries[0]} only → borders, bonds and FX stay hidden until you cross one.`);

  return (
    <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 pb-16 pt-28">
      <div className="grid w-full max-w-[1100px] grid-cols-1 gap-10 lg:grid-cols-5">
        {/* left — conversational form cards */}
        <div className="space-y-8 lg:col-span-3">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="show">
            <h1 className="font-display text-h1 text-text-1">Who are we learning?</h1>
            <p className="mt-2 text-body text-text-2">
              No settings pages. Just tell me who you are — I'll shape the OS around it.
            </p>
          </motion.div>

          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="show">
            <label className="text-micro uppercase text-text-3" htmlFor="ob-name">
              What do you call the business?
            </label>
            <input
              id="ob-name"
              value={identity.name}
              onChange={(e) => change({ name: e.target.value })}
              placeholder="Meridian Freight"
              className="mt-2 w-full border-b border-line-strong bg-transparent pb-2 font-display text-h2 text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-teal"
            />
          </motion.div>

          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="show">
            <p className="text-micro uppercase text-text-3">What kind of operation?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPS.map(({ label, icon: Icon }) => (
                <SelectChip
                  key={label}
                  selected={identity.ops.includes(label)}
                  onClick={() => change({ ops: toggle(identity.ops, label) })}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </SelectChip>
              ))}
            </div>
          </motion.div>

          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="show">
            <p className="text-micro uppercase text-text-3">Where do you operate?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {COUNTRIES.map((c) => (
                <SelectChip
                  key={c}
                  selected={identity.countries.includes(c)}
                  onClick={() => change({ countries: toggle(identity.countries, c) })}
                >
                  {c}
                </SelectChip>
              ))}
              {identity.countries
                .filter((c) => !COUNTRIES.includes(c))
                .map((c) => (
                  <SelectChip
                    key={c}
                    selected
                    onClick={() => change({ countries: toggle(identity.countries, c) })}
                  >
                    {c}
                  </SelectChip>
                ))}
              {addingCountry ? (
                <input
                  autoFocus
                  value={countryDraft}
                  onChange={(e) => setCountryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && countryDraft.trim()) {
                      change({ countries: [...identity.countries, countryDraft.trim()] });
                      setCountryDraft('');
                      setAddingCountry(false);
                    }
                    if (e.key === 'Escape') setAddingCountry(false);
                  }}
                  onBlur={() => setAddingCountry(false)}
                  placeholder="Country"
                  className="w-32 rounded-chip border border-teal bg-transparent px-3 py-2 text-small text-text-1 outline-none"
                />
              ) : (
                <SelectChip selected={false} onClick={() => setAddingCountry(true)}>
                  <Plus className="h-4 w-4" />
                  add country
                </SelectChip>
              )}
            </div>
          </motion.div>

          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="show">
            <p className="text-micro uppercase text-text-3">How many wheels?</p>
            <div className="mt-3 inline-flex rounded-full border border-line-hairline bg-surface-2 p-0.5">
              {FLEET.map((f) => (
                <button
                  key={f}
                  onClick={() => change({ fleet: identity.fleet === f ? null : f })}
                  className={cn(
                    'relative rounded-full px-4 py-1.5 text-small transition-colors',
                    identity.fleet === f ? 'text-canvas' : 'text-text-3 hover:text-text-2',
                  )}
                >
                  {identity.fleet === f && (
                    <motion.span
                      layoutId="fleet-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-full bg-ember"
                    />
                  )}
                  <span className="relative font-mono">{f}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            custom={5}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="flex justify-end pt-2"
          >
            <button
              onClick={onContinue}
              disabled={!identity.name.trim()}
              className="rounded-chip bg-ember px-6 py-2.5 text-body-strong text-canvas transition-all duration-150 hover:-translate-y-px hover:bg-ember-hi disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </motion.div>
        </div>

        {/* right — What this changes */}
        <motion.aside
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="lg:col-span-2"
        >
          <div
            className={cn(
              'rounded-panel border border-line-hairline bg-surface-1 p-6',
              burst && 'living-border',
            )}
          >
            <p className="text-micro uppercase text-text-3">What this changes</p>
            <div className="mt-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {lines.map((line) => (
                  <motion.p
                    key={line}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                    transition={SPRING_SNAPPY}
                    className="flex gap-2 text-small text-text-2"
                  >
                    <span className="mt-0.5 shrink-0 text-[10px] text-teal">◈</span>
                    {line}
                  </motion.p>
                ))}
              </AnimatePresence>
              {lines.length === 0 && (
                <p className="text-small text-text-3">
                  Answer on the left — I'll show you, live, what each answer changes about your
                  operating system.
                </p>
              )}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
