import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil } from 'lucide-react';
import { useStore, uid } from '@/store';
import type { FactKind } from '@/store';
import { WordReveal } from './bits';
import { EASE_OUT_EXPO, SPRING_SNAPPY } from './types';
import type { InterviewFact } from './types';
import { cn } from '@/lib/utils';

interface Question {
  text: string;
  chips: string[];
  kind: FactKind;
  free: boolean;
  multi: boolean;
  prefill?: string;
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  {
    text: 'Which lanes do you run most?',
    chips: ['Nairobi→Kampala', 'Mombasa→Kigali'],
    kind: 'lane',
    free: true,
    multi: true,
    placeholder: 'Add a lane…',
  },
  {
    text: 'Who are your best customers?',
    chips: ['Bidco Africa', 'Twiga Foods'],
    kind: 'customer',
    free: true,
    multi: true,
    placeholder: 'Add a customer…',
  },
  {
    text: 'How do you price — per km, per ton, or lane flat?',
    chips: ['Per km', 'Per ton', 'Lane flat'],
    kind: 'pricing',
    free: false,
    multi: false,
  },
  {
    text: 'Any rules you never break?',
    chips: [],
    kind: 'rule',
    free: true,
    multi: true,
    prefill: 'Never quote below cost + 12%.',
    placeholder: 'A rule you never break…',
  },
  {
    text: 'Who else touches your freight?',
    chips: ['Rwanda Link Logistics — subcontractor, Kigali'],
    kind: 'partner',
    free: true,
    multi: true,
    placeholder: 'Add a partner…',
  },
  {
    text: 'What should I never do without asking?',
    chips: ['Send customer messages', 'Spend over $200', 'Bid on Exchange', 'Nothing, I trust you'],
    kind: 'rule',
    free: false,
    multi: true,
  },
];

type HistoryEntry = { qIndex: number; values: string[] } | { qIndex: number; skipped: true };

function ConductorBubble({ text, animate }: { text: string; animate?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal shadow-glow-teal" />
      <div className="max-w-[560px] rounded-panel border border-line-hairline bg-surface-1 px-4 py-3 text-body text-text-1">
        {animate ? <WordReveal text={text} stagger={0.01} /> : text}
      </div>
    </div>
  );
}

/** Step 3 — The Interview ("Six questions. Then I stop asking."). */
export default function StepInterview({ onDone }: { onDone: () => void }) {
  const teachFact = useStore((s) => s.teachFact);
  const correctFact = useStore((s) => s.correctFact);
  const [qIndex, setQIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [facts, setFacts] = useState<InterviewFact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const q = QUESTIONS[Math.min(qIndex, QUESTIONS.length - 1)];
  const finished = qIndex >= QUESTIONS.length;

  // advance to the next question, resetting the composer (demo prefill on Q4)
  const advance = () => {
    const next = qIndex + 1;
    setQIndex(next);
    setSelected([]);
    setDraft(next < QUESTIONS.length ? (QUESTIONS[next].prefill ?? '') : '');
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [qIndex, history.length]);

  const toggleChip = (v: string) => {
    if (q.multi) setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
    else setSelected([v]);
  };

  const submit = () => {
    const values = [...selected];
    const d = draft.trim();
    if (d && !values.includes(d)) values.push(d);
    if (values.length === 0) return;
    const newFacts = values.map((v) => {
      const taught = teachFact({ label: v, kind: q.kind });
      return {
        id: uid('if'),
        qIndex,
        kind: q.kind,
        label: v,
        confidence: q.kind === 'rule' || q.kind === 'pricing' ? 100 : 90,
        factId: taught.id,
      };
    });
    setFacts((f) => [...f, ...newFacts]);
    setHistory((h) => [...h, { qIndex, values }]);
    advance();
  };

  const skip = () => {
    setHistory((h) => [...h, { qIndex, skipped: true }]);
    advance();
  };

  const saveEdit = (fact: InterviewFact) => {
    const label = editDraft.trim();
    if (!label) return;
    if (fact.factId) correctFact(fact.factId, label);
    setFacts((fs) => fs.map((f) => (f.id === fact.id ? { ...f, label } : f)));
    setEditingId(null);
  };

  return (
    <div className="relative z-10 flex min-h-[100dvh] items-start justify-center gap-8 px-6 pb-16 pt-28">
      {/* conversation column */}
      <div className="w-full max-w-[720px]">
        <div className="flex items-end justify-between">
          <h1 className="font-display text-h1 text-text-1">Six questions. Then I stop asking.</h1>
          {!finished && (
            <span className="shrink-0 font-mono text-micro uppercase text-text-3">
              {qIndex + 1} of {QUESTIONS.length}
            </span>
          )}
        </div>

        <div className="mt-8 space-y-6">
          {history.map((h, i) => (
            <div key={i} className="space-y-3">
              <ConductorBubble text={QUESTIONS[h.qIndex].text} />
              {'skipped' in h ? (
                <p className="pr-2 text-right text-small italic text-text-3">
                  skipped — I'll learn this from behavior
                </p>
              ) : (
                <div className="flex flex-wrap justify-end gap-2 pr-2">
                  {h.values.map((v) => (
                    <span
                      key={v}
                      className="rounded-chip border border-ember/40 bg-ember-dim px-2.5 py-1 text-caption text-ember"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!finished ? (
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="space-y-4"
            >
              <ConductorBubble text={q.text} animate />
              <div className="flex flex-wrap items-center justify-end gap-2 pr-2">
                {q.chips.map((chip) => {
                  const active = selected.includes(chip);
                  return (
                    <motion.button
                      key={chip}
                      layoutId={active ? `fly-${qIndex}-${chip}` : undefined}
                      onClick={() => toggleChip(chip)}
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING_SNAPPY}
                      className={cn(
                        'rounded-chip border px-2.5 py-1 text-caption transition-colors duration-150',
                        active
                          ? 'border-ember/60 bg-ember-dim text-ember'
                          : 'border-line-strong text-text-2 hover:border-ember/50 hover:text-text-1',
                      )}
                    >
                      {chip}
                    </motion.button>
                  );
                })}
                {q.free && (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder={q.placeholder}
                    className="w-56 rounded-chip border border-line-strong bg-transparent px-3 py-1 text-caption text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-teal"
                  />
                )}
              </div>
              <div className="flex items-center justify-end gap-4 pr-2">
                <button
                  onClick={skip}
                  className="text-small text-text-3 transition-colors hover:text-text-1"
                >
                  skip — I'll learn this from behavior
                </button>
                <button
                  onClick={submit}
                  disabled={selected.length === 0 && !draft.trim()}
                  className="rounded-chip bg-ember px-4 py-1.5 text-small font-semibold text-canvas transition-colors hover:bg-ember-hi disabled:cursor-not-allowed disabled:opacity-40"
                >
                  That's my answer
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="space-y-6"
            >
              <ConductorBubble
                text="That's all I need — for now. Everything else, I'll learn by watching you work. Ready to see what you've become?"
                animate
              />
              <div className="flex justify-end pr-2">
                <button
                  onClick={onDone}
                  className="rounded-chip bg-ember px-6 py-2.5 text-body-strong text-canvas transition-all duration-150 hover:-translate-y-px hover:bg-ember-hi"
                >
                  Watch your model assemble →
                </button>
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* right rail — Your model so far */}
      <aside className="sticky top-28 hidden w-[280px] shrink-0 lg:block">
        <p className="text-micro uppercase text-text-3">Your model so far</p>
        <div className="mt-3 space-y-2">
          <AnimatePresence>
            {facts.map((fact) => (
              <motion.div
                key={fact.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                className="relative overflow-hidden rounded-card border border-teal/25 bg-surface-1 p-3"
              >
                {/* Materialize — teal shimmer sweep */}
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-teal/15 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-micro uppercase text-teal">{fact.kind}</span>
                  <button
                    onClick={() => {
                      setEditingId(fact.id);
                      setEditDraft(fact.label);
                    }}
                    className="text-text-3 transition-colors hover:text-teal"
                    aria-label="Edit fact"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                {editingId === fact.id ? (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(fact);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-full rounded-chip border border-teal bg-transparent px-2 py-1 text-caption text-text-1 outline-none"
                    />
                    <button
                      onClick={() => saveEdit(fact)}
                      className="shrink-0 text-teal"
                      aria-label="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <motion.p
                    layoutId={`fly-${fact.qIndex}-${fact.label}`}
                    className="mt-1 text-caption text-text-1"
                  >
                    {fact.label}
                  </motion.p>
                )}
                <p className="mt-1 text-[10px] text-text-3">
                  source: you · confidence {fact.confidence}%
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          {facts.length === 0 && (
            <p className="rounded-card border border-dashed border-line-strong p-3 text-caption text-text-3">
              Every answer materializes here as a fact — cited, confident, correctable.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
