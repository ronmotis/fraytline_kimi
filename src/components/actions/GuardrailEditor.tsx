import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Plus, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import type { Policy } from '@/store';
import { BACKDROP_STYLE, tintStyle } from './tints';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SCOPE: Record<Policy['kind'], string[]> = {
  'margin-floor': ['Quotes', 'Exchange'],
  'spend-cap': ['Money'],
  'bid-floor': ['Exchange'],
  notify: ['Movements'],
  block: ['Dispatch'],
  'time-window': ['Comms'],
};

const ENFORCEMENT: Record<Policy['kind'], string> = {
  'margin-floor': 'blocked 2× · 30d',
  'spend-cap': '12 auto-approved · 30d',
  'bid-floor': 'blocked 1× · 30d',
  notify: 'notified 3× · 30d',
  block: 'hard rule · 0 breaches',
  'time-window': 'held 2 drafts · 30d',
};

const SUSPEND_WARNING: Record<Policy['kind'], string> = {
  'margin-floor': 'Suspending this guardrail means I may quote below your cost + margin floor.',
  'spend-cap': 'Suspending this guardrail means I may auto-approve expenses above your cap without asking.',
  'bid-floor': 'Suspending this guardrail means I may bid below your floor on the Exchange.',
  notify: 'Suspending this guardrail means you won’t be alerted when border delays exceed your threshold.',
  block: 'Suspending this hard rule means undocumented carriers could be assigned. Are you sure?',
  'time-window': 'Suspending this guardrail means customer messages may go out at any hour.',
};

const EDITABLE_PARAM: Partial<Record<Policy['kind'], { key: string; label: string }>> = {
  'margin-floor': { key: 'pct', label: 'margin %' },
  'spend-cap': { key: 'maxUsd', label: 'cap (USD)' },
  'bid-floor': { key: 'minUsd', label: 'floor (USD)' },
  notify: { key: 'hours', label: 'hours' },
};

interface LocalRule {
  id: string;
  label: string;
  scope: string[];
  condition: string;
}

function guessScope(text: string): { scope: string[]; condition: string } {
  const q = text.toLowerCase();
  if (/bid|exchange/.test(q)) return { scope: ['Exchange bids'], condition: 'condition met → Block & escalate' };
  if (/quote|price|margin/.test(q)) return { scope: ['Quotes'], condition: 'condition met → Block & escalate' };
  if (/expense|spend|advance|\$/.test(q)) return { scope: ['Money'], condition: 'above limit → escalate to you' };
  if (/message|customer|eta|update/.test(q)) return { scope: ['Comms'], condition: 'outside window → hold & ask' };
  if (/driver|dispatch|assign/.test(q)) return { scope: ['Dispatch'], condition: 'condition met → Block, always' };
  return { scope: ['All workflows'], condition: 'condition met → escalate to you' };
}

/** Section C — Guardrails: plain-language policy list, toggles, NL rule creation. */
export default function GuardrailEditor() {
  const tenant = useActiveTenant();
  const policies = useStore((s) => s.policies.filter((p) => p.tenantId === s.activeTenantId));
  const pushToast = useStore((s) => s.pushToast);
  const role = useStore((s) => s.role);
  const readOnly = role !== 'Owner';

  const [enabledOverrides, setEnabledOverrides] = useState<Record<string, boolean>>({});
  const [editedParams, setEditedParams] = useState<Record<string, string>>({});
  const [localRules, setLocalRules] = useState<LocalRule[]>([]);
  const [suspendTarget, setSuspendTarget] = useState<Policy | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paramDraft, setParamDraft] = useState('');

  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleText, setRuleText] = useState('');
  const [rulePhase, setRulePhase] = useState<'idle' | 'thinking' | 'preview'>('idle');
  const [ruleParsed, setRuleParsed] = useState<{ scope: string[]; condition: string } | null>(null);

  const isEnabled = (p: Policy) => enabledOverrides[p.id] ?? p.enabled;
  const activeCount = useMemo(
    () => policies.filter(isEnabled).length + localRules.length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policies, enabledOverrides, localRules],
  );

  const requestToggle = (p: Policy) => {
    if (isEnabled(p)) setSuspendTarget(p);
    else {
      setEnabledOverrides((o) => ({ ...o, [p.id]: true }));
      pushToast({ title: 'Guardrail re-activated', body: p.label, tone: 'ok' });
    }
  };

  const confirmSuspend = () => {
    if (!suspendTarget) return;
    setEnabledOverrides((o) => ({ ...o, [suspendTarget.id]: false }));
    pushToast({ title: 'Guardrail suspended', body: suspendTarget.label, tone: 'ember' });
    setSuspendTarget(null);
  };

  const saveParam = (p: Policy) => {
    const meta = EDITABLE_PARAM[p.kind];
    if (meta && paramDraft.trim()) {
      setEditedParams((o) => ({ ...o, [p.id]: `${meta.label}: ${paramDraft.trim()}` }));
      pushToast({ title: 'Guardrail updated', body: `${p.label} → ${paramDraft.trim()}`, tone: 'teal' });
    }
    setEditingId(null);
    setParamDraft('');
  };

  const submitRule = () => {
    if (!ruleText.trim()) return;
    setRulePhase('thinking');
    setTimeout(() => {
      setRuleParsed(guessScope(ruleText));
      setRulePhase('preview');
    }, 500);
  };

  const activateRule = () => {
    if (!ruleParsed) return;
    setLocalRules((r) => [
      { id: `local-${Date.now()}`, label: ruleText.trim(), scope: ruleParsed.scope, condition: ruleParsed.condition },
      ...r,
    ]);
    pushToast({ title: 'Guardrail activated', body: 'applies immediately · logged to Ledger', tone: 'teal' });
    setRuleText('');
    setRuleParsed(null);
    setRulePhase('idle');
    setRuleOpen(false);
  };

  return (
    <section className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-h2 text-text-1">Guardrails — the rules I never break</h2>
          <p className="mt-1 text-small text-text-3">
            {activeCount} active for {tenant.name}. Autonomy never overrides these.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setRuleOpen((v) => !v)}
            style={tintStyle('teal')}
            className="flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-caption font-medium text-teal transition-opacity hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" /> New rule in plain words
          </button>
        )}
      </div>

      {/* NL rule creation */}
      <AnimatePresence>
        {ruleOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="relative mb-3 rounded-card border border-line-hairline border-l-2 border-l-teal bg-surface-1 p-3.5">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={ruleText}
                  onChange={(e) => { setRuleText(e.target.value); setRulePhase('idle'); }}
                  onKeyDown={(e) => e.key === 'Enter' && submitRule()}
                  placeholder='e.g. "Never bid below cost + 12%"'
                  className="min-w-0 flex-1 bg-transparent text-body text-text-1 caret-teal outline-none placeholder:text-text-3"
                />
                <button
                  onClick={submitRule}
                  disabled={!ruleText.trim() || rulePhase === 'thinking'}
                  className="shrink-0 rounded-chip bg-teal px-3 py-1.5 text-caption font-medium text-canvas hover:opacity-90 disabled:opacity-40"
                >
                  Parse
                </button>
              </div>
              {rulePhase === 'thinking' && <div className="thinking-line mt-2 h-px w-full" />}
              {rulePhase === 'preview' && ruleParsed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-micro uppercase text-teal">
                    <Sparkles className="h-3 w-3" /> Parsed guardrail
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-small">
                    {ruleParsed.scope.map((s) => (
                      <span key={s} className="rounded-chip border border-line-strong bg-surface-2 px-2 py-1 text-text-2">
                        Scope: <span className="text-text-1">{s}</span>
                      </span>
                    ))}
                    <span className="rounded-chip border border-line-strong bg-surface-2 px-2 py-1 text-text-2">
                      Condition: <span className="text-text-1">{ruleParsed.condition}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={activateRule}
                      className="rounded-chip bg-ember px-3.5 py-1.5 text-small font-medium text-canvas hover:bg-ember-hi"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => { setRulePhase('idle'); setRuleParsed(null); }}
                      className="rounded-chip border border-line-strong px-3 py-1.5 text-small text-text-2 hover:text-text-1"
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* policy list */}
      <div className="flex-1 space-y-2.5">
        <AnimatePresence initial={false}>
          {localRules.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8, borderColor: 'rgba(47,211,190,0.9)' }}
              animate={{ opacity: 1, y: 0, borderColor: 'rgba(235,225,205,0.08)' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: EASE, borderColor: { duration: 1.4 } }}
              className="rounded-card border bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-body-strong text-text-1">{r.label}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {r.scope.map((s) => (
                      <span key={s} className="rounded-chip border border-line-hairline bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-3">{s}</span>
                    ))}
                    <span style={tintStyle('ember')} className="rounded-chip border px-1.5 py-0.5 text-[10px] font-medium text-ember">you</span>
                    <span className="text-[10px] text-text-3">{r.condition} · new — no enforcements yet</span>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-caption text-ok">
                  <ShieldCheck className="h-3.5 w-3.5" /> active
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {policies.map((p, i) => {
          const enabled = isEnabled(p);
          const hard = p.kind === 'block';
          const meta = EDITABLE_PARAM[p.kind];
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: EASE }}
              className={cn(
                'rounded-card border border-line-hairline bg-surface-1 p-4',
                hard && 'border-l-2 border-l-danger',
                !enabled && 'opacity-55',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-body-strong text-text-1">{p.label}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {SCOPE[p.kind].map((s) => (
                      <span key={s} className="rounded-chip border border-line-hairline bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-3">{s}</span>
                    ))}
                    {p.kind === 'bid-floor' ? (
                      <span style={tintStyle('teal')} className="rounded-chip border px-1.5 py-0.5 text-[10px] font-medium text-teal">
                        learned from your corrections ◈
                      </span>
                    ) : (
                      <span style={tintStyle('ember')} className="rounded-chip border px-1.5 py-0.5 text-[10px] font-medium text-ember">you</span>
                    )}
                    <span className="font-mono text-[10px] text-text-3">{ENFORCEMENT[p.kind]}</span>
                    {editedParams[p.id] && (
                      <span style={tintStyle('teal')} className="rounded-chip border px-1.5 py-0.5 text-[10px] text-teal">
                        edited · {editedParams[p.id]}
                      </span>
                    )}
                    {hard && <span className="text-[10px] font-medium text-danger">hard rule</span>}
                  </div>

                  {/* inline param editor */}
                  <AnimatePresence>
                    {editingId === p.id && meta && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-caption text-text-3">{meta.label}</span>
                          <input
                            autoFocus
                            value={paramDraft}
                            onChange={(e) => setParamDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveParam(p)}
                            placeholder={String(p.params[meta.key] ?? '')}
                            className="w-28 rounded-chip border border-line-strong bg-surface-2 px-2 py-1 font-mono text-data text-text-1 outline-none focus:border-teal"
                          />
                          <button onClick={() => saveParam(p)} className="rounded-chip bg-teal px-2.5 py-1 text-caption font-medium text-canvas">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-caption text-text-3 hover:text-text-1">Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {meta && !readOnly && (
                    <button
                      onClick={() => { setEditingId(editingId === p.id ? null : p.id); setParamDraft(''); }}
                      className="text-text-3 transition-colors hover:text-text-1"
                      aria-label="Edit rule"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* toggle */}
                  <button
                    role="switch"
                    aria-checked={enabled}
                    disabled={readOnly}
                    onClick={() => requestToggle(p)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors duration-150',
                      enabled ? 'bg-teal' : 'bg-surface-3',
                      readOnly && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-canvas',
                        enabled ? 'right-0.5' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* suspend confirmation */}
      <AnimatePresence>
        {suspendTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={BACKDROP_STYLE}
            className="fixed inset-0 z-[80] flex items-start justify-center pt-[18vh]"
            onClick={() => setSuspendTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: -8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: -8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-[460px] max-w-[92vw] rounded-modal border border-line-strong p-6 shadow-modal"
            >
              <div className="flex items-start justify-between">
                <div className="font-display text-h3 text-text-1">Suspend this guardrail?</div>
                <button onClick={() => setSuspendTarget(null)} className="text-text-3 hover:text-text-1" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-body text-text-2">{SUSPEND_WARNING[suspendTarget.kind]}</p>
              <p className="mt-1.5 text-caption text-text-3">You can re-activate it any time — the change logs to the Ledger.</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={confirmSuspend}
                  className="rounded-chip bg-ember px-4 py-2 text-small font-medium text-canvas hover:bg-ember-hi"
                >
                  Confirm — suspend
                </button>
                <button
                  onClick={() => setSuspendTarget(null)}
                  className="rounded-chip border border-line-strong px-4 py-2 text-small text-text-2 hover:text-text-1"
                >
                  Keep it on
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
