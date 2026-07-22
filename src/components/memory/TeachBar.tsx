import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Sparkles, X } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import type { FactKind } from '@/store';
import { cn } from '@/lib/utils';

export interface TeachBarHandle {
  prefill: (text: string) => void;
  focus: () => void;
}

interface Parsed {
  entity: string;
  relation: string;
  value: string;
  kind: FactKind;
}

const KNOWN_ENTITIES = [
  'Bidco', 'Twiga', 'KenGen', 'Dangote', 'Melcom', 'Cocoa',
  'Rwanda Link', 'Malaba', 'Busia', 'Juba', 'Kampala', 'Nairobi', 'Mombasa',
  'Kigali', 'Tema', 'Accra', 'Kumasi', 'Takoradi', 'Ouagadougou',
];

function parseTeaching(text: string): Parsed {
  const entity = KNOWN_ENTITIES.find((e) => text.toLowerCase().includes(e.toLowerCase())) ?? 'General';
  let relation = 'states';
  if (/require|need|must/i.test(text)) relation = 'requires';
  else if (/prefer/i.test(text)) relation = 'prefers';
  else if (/never|avoid/i.test(text)) relation = 'never';
  else if (/always/i.test(text)) relation = 'always';

  let kind: FactKind = 'pattern';
  if (/never|always|requires|must/i.test(text)) kind = 'rule';
  else if (entity !== 'General' && /bidco|twiga|kengen|dangote|melcom|cocoa/i.test(entity)) kind = 'customer';
  else if (/route|lane|via|→|->/i.test(text)) kind = 'lane';

  const value = text.length > 64 ? `${text.slice(0, 64)}…` : text;
  return { entity, relation, value, kind };
}

/** Teach bar (memory.md §1): type → Thinking → parsed preview → Confirm → materialize. */
const TeachBar = forwardRef<TeachBarHandle, { onTaught: (text: string) => void }>(function TeachBar({ onTaught }, ref) {
  const teachFact = useStore((s) => s.teachFact);
  const tenant = useActiveTenant();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'preview'>('idle');
  const [parsed, setParsed] = useState<Parsed | null>(null);

  useImperativeHandle(ref, () => ({
    prefill: (t: string) => {
      setText(t);
      setPhase('idle');
      inputRef.current?.focus();
    },
    focus: () => inputRef.current?.focus(),
  }));

  const submit = () => {
    const t = text.trim();
    if (!t || phase === 'thinking') return;
    setPhase('thinking');
    setTimeout(() => {
      setParsed(parseTeaching(t));
      setPhase('preview');
    }, 500);
  };

  const confirm = () => {
    const t = text.trim();
    teachFact({ label: t, kind: parsed?.kind });
    onTaught(t);
    setText('');
    setParsed(null);
    setPhase('idle');
  };

  const discard = () => {
    setParsed(null);
    setPhase('idle');
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-3 rounded-card border border-line-hairline border-l-2 border-l-teal bg-surface-1 px-4 py-3',
          'transition-colors focus-within:border-line-strong focus-within:border-l-teal',
        )}
      >
        <GraduationCap className="h-4 w-4 shrink-0 text-teal" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); if (phase !== 'idle') setPhase('idle'); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Teach me something… e.g. "${tenant.id === 'savannah' ? 'Melcom requires Friday delivery before noon' : 'Bidco requires POD within 24h'}" or "never route via Juba in rainy season"`}
          className="min-w-0 flex-1 bg-transparent text-body text-text-1 caret-teal outline-none placeholder:text-text-3"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || phase === 'thinking'}
          className="shrink-0 rounded-chip bg-teal px-4 py-1.5 text-small font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Teach
        </button>
      </div>

      <AnimatePresence>
        {phase === 'thinking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-4 -bottom-1"
          >
            <div className="thinking-line h-px w-full" />
          </motion.div>
        )}
        {phase === 'preview' && parsed && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="glass absolute inset-x-0 top-full z-40 mt-2 rounded-card border border-line-strong p-4 shadow-modal"
          >
            <div className="mb-2 flex items-center gap-1.5 text-micro uppercase text-teal">
              <Sparkles className="h-3 w-3" /> Understood — confirm to store
            </div>
            <div className="flex flex-wrap items-center gap-2 text-small">
              <span className="rounded-chip border border-line-strong bg-surface-2 px-2 py-1 text-text-2">
                Entity: <span className="text-text-1">{parsed.entity}</span>
              </span>
              <span className="rounded-chip border border-line-strong bg-surface-2 px-2 py-1 text-text-2">
                Relation: <span className="text-text-1">{parsed.relation}</span>
              </span>
              <span className="rounded-chip border border-line-strong bg-surface-2 px-2 py-1 text-text-2">
                Value: <span className="text-text-1">{parsed.value}</span>
              </span>
            </div>
            <p className="mt-2 text-caption text-text-3">
              Starts at 55% confidence (source: you) and strengthens as jobs confirm it.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirm}
                className="rounded-chip bg-ember px-3.5 py-1.5 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
              >
                Confirm — remember this
              </button>
              <button
                onClick={discard}
                className="flex items-center gap-1 rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 hover:text-text-1"
              >
                <X className="h-3.5 w-3.5" /> Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TeachBar;
