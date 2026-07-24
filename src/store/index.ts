// Fraytline central store — stateful demo universe + Conductor engines (design.md §14).
// Page agents: consume actions and slices from here; everything is typed in ./types.
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  ApprovalAction, AutonomyLevel, Currency, DockMessage, Driver, ExchangeCapacity,
  ExchangeLoad, FleetUnit, IntentResult, LedgerEntry, MemoryFact, Money, Movement,
  Person, Policy, PolicyCheck, PriceSuggestion, FitResult, Quote, Role, Tenant, Toast,
  Customer, FactKind, Capability, Inquiry,
} from './types';
import * as seed from './seed';

export type * from './types';

// ---------- helpers ----------

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const nowTime = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: '$', KES: 'KES ', UGX: 'UGX ', RWF: 'RWF ', GHS: 'GH₵',
};

export const fmtMoney = (m: Money) =>
  `${CURRENCY_SYMBOL[m.currency]}${m.amount.toLocaleString('en-US')}`;

export const ownerName = (tenantId: string) => (tenantId === 'savannah' ? 'Kwabena' : 'Wanjiru');

/** name of the signed-in person (falls back to the tenant owner for legacy flows) */
const sessionName = (people: { id: string; name: string }[], sessionUserId: string | null, tenantId: string) => {
  const p = people.find((pp) => pp.id === sessionUserId);
  return p ? p.name.split(' ')[0] : ownerName(tenantId);
};

export function forTenant<T extends { tenantId: string }>(items: T[], tenantId: string): T[] {
  return items.filter((i) => i.tenantId === tenantId);
}

const laneKey = (from: string, to: string) => `${from}→${to}`.toLowerCase().replace(/\s+/g, '');

export const laneLabel = (from: string, to: string) => `${from}→${to}`;

// ---------- role → capability map (Identity slice) ----------

export const ROLE_CAPS: Record<Role, Capability[]> = {
  Owner: ['approve', 'assign', 'bid', 'settle', 'admin', 'audit.undo'],
  Dispatcher: ['assign'],
  Finance: ['approve', 'settle'],
  Driver: [],
  Customer: [],
};

/** what each role is locked out of, for UI hints */
export const ROLE_LOCKS: Record<Role, string> = {
  Owner: '',
  Dispatcher: 'Governance approvals, bidding and finance actions need an Owner or Finance sign-in.',
  Finance: 'Dispatch assignment and administration need an Owner sign-in.',
  Driver: 'Drivers see their manifest only.',
  Customer: 'Customers track their own movement only.',
};

// ---------- store shape ----------

export interface StoreState {
  // session
  activeTenantId: string;
  role: Role;
  sessionUserId: string | null;
  roleBannerDismissed: boolean;
  commandBarOpen: boolean;
  dockOpen: boolean;
  toasts: Toast[];
  autonomy: Record<string, AutonomyLevel>;
  tickCount: number;

  // data
  tenants: Tenant[];
  people: Person[];
  customers: Customer[];
  fleet: FleetUnit[];
  drivers: Driver[];
  movements: Movement[];
  quotes: Quote[];
  inquiries: Inquiry[];
  memoryFacts: MemoryFact[];
  policies: Policy[];
  approvals: ApprovalAction[];
  ledger: LedgerEntry[];
  exchangeLoads: ExchangeLoad[];
  exchangeCapacity: ExchangeCapacity[];
  dockMessages: DockMessage[];

  // session actions
  signIn: (personId: string) => void;
  signOut: () => void;
  can: (cap: Capability) => boolean;
  switchTenant: (tenantId: string) => void;
  switchRole: (role: Role) => void;
  dismissRoleBanner: () => void;
  setCommandBarOpen: (open: boolean) => void;
  setDockOpen: (open: boolean) => void;
  setAutonomy: (workflow: string, level: AutonomyLevel) => void;

  // toasts
  pushToast: (t: Omit<Toast, 'id' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;

  // learning loop
  confirmFact: (factId: string) => void;
  correctFact: (factId: string, correction: string) => void;
  forgetFact: (factId: string) => void;
  teachFact: (input: { label: string; value?: string; kind?: FactKind }) => MemoryFact;

  // governance
  approveAction: (actionId: string) => void;
  rejectAction: (actionId: string) => void;
  undoLedgerEntry: (entryId: string) => void;
  checkPolicy: (input: {
    kind: 'expense' | 'bid' | 'message' | 'quote' | 'exchange-post';
    amountUsd?: number;
    marginPct?: number;
    lane?: string;
    docClass?: string;
    hour?: number;
  }) => PolicyCheck;

  // intelligence engines
  suggestPrice: (lane: { from: string; to: string }, cargo?: string) => PriceSuggestion;
  fitScore: (load: ExchangeLoad) => FitResult;
  parseIntent: (text: string) => IntentResult;

  // mutations page agents use
  addQuoteFromIntent: (draft: { from: string; to: string; weightT: number; customer?: string; cargo: string; pickupDate?: string }, suggestion: PriceSuggestion | null) => Quote;
  convertQuoteToMovement: (quoteId: string) => Movement | undefined;
  addInquiry: (input: { customer: string; from: string; to: string; cargo: string; weightT: number; channel: Inquiry['channel']; note?: string }) => Inquiry;
  closeInquiry: (inquiryId: string) => void;
  quoteFromInquiry: (inquiryId: string) => Quote | undefined;
  markQuoteWon: (quoteId: string) => void;
  markQuoteLost: (quoteId: string, reason: string) => void;
  assignDriver: (movementId: string, vehicleId: string) => void;
  startTrip: (movementId: string) => void;
  sendQuote: (quoteId: string) => void;
  postCapacity: (input: { from: string; to: string; date: string; vehiclePlate: string }) => ExchangeCapacity;
  placeBid: (loadId: string, amount: number) => PolicyCheck;
  resolveDockMessage: (id: string) => void;
  tick: () => void;
}

// ---------- store ----------

const baseStore = create<StoreState>()((set, get) => {
  /** append a ledger entry and (optionally) surface a toast; returns the entry */
  const writeLedger = (
    partial: Omit<LedgerEntry, 'id' | 'time' | 'undone'>,
    toast?: { title: string; body?: string; tone?: Toast['tone'] },
  ): LedgerEntry => {
    const entry: LedgerEntry = { ...partial, id: uid('lg'), time: nowTime(), undone: false };
    set((s) => ({ ledger: [entry, ...s.ledger] }));
    if (toast) {
      get().pushToast({
        title: toast.title,
        body: `${toast.body ? `${toast.body} · ` : ''}logged to Ledger`,
        tone: toast.tone ?? 'ok',
        ledgerLink: true,
        undoEntryId: entry.reversible ? entry.id : undefined,
      });
    }
    return entry;
  };

  const learnedToast = (fact: MemoryFact) =>
    get().pushToast({
      title: `Fraytline learned: ${fact.label}`,
      body: `confidence ${fact.confidence}% · visible in Memory`,
      tone: 'teal',
    });

  // hydrate identity from the persisted session (role/tenant follow the person, not defaults)
  const initSession = (() => {
    try {
      const id = localStorage.getItem('fraytline-session');
      const p = seed.people.find((pp) => pp.id === id);
      if (p) return { id: p.id, tenantId: p.tenantId, role: (p.role === 'Partner' ? 'Dispatcher' : p.role) as Role };
    } catch { /* ignore */ }
    return { id: null as string | null, tenantId: 'meridian', role: 'Owner' as Role };
  })();

  return {
    activeTenantId: initSession.tenantId,
    role: initSession.role,
    roleBannerDismissed: false,
    commandBarOpen: false,
    dockOpen: true,
    toasts: [],
    autonomy: { ...seed.defaultAutonomy },
    tickCount: 0,

    tenants: seed.tenants,
    people: seed.people,
    customers: seed.customers,
    fleet: seed.fleet,
    drivers: seed.drivers,
    movements: seed.movements,
    quotes: seed.quotes,
    inquiries: seed.inquiries,
    memoryFacts: seed.memoryFacts,
    policies: seed.policies,
    approvals: seed.approvals,
    ledger: seed.ledger,
    exchangeLoads: seed.exchangeLoads,
    exchangeCapacity: seed.exchangeCapacity,
    dockMessages: seed.dockMessages,

    // ----- session -----
    sessionUserId: initSession.id,

    signIn: (personId) => {
      const person = get().people.find((p) => p.id === personId);
      if (!person) return;
      const role: Role = person.role === 'Partner' ? 'Dispatcher' : person.role;
      try { localStorage.setItem('fraytline-session', personId); } catch { /* ignore */ }
      set({ sessionUserId: personId, activeTenantId: person.tenantId, role, roleBannerDismissed: role === 'Owner' });
      writeLedger({
        tenantId: person.tenantId, actor: 'user', actorName: person.name,
        action: `Signed in · ${person.name} (${role})`, verdict: 'auto',
        verdictLabel: 'session started', reversible: false,
      });
    },

    signOut: () => {
      const s = get();
      const person = s.people.find((p) => p.id === s.sessionUserId);
      try { localStorage.removeItem('fraytline-session'); } catch { /* ignore */ }
      if (person) {
        writeLedger({
          tenantId: person.tenantId, actor: 'user', actorName: person.name,
          action: `Signed out · ${person.name}`, verdict: 'auto',
          verdictLabel: 'session ended', reversible: false,
        });
      }
      set({ sessionUserId: null });
    },

    can: (cap) => ROLE_CAPS[get().role].includes(cap),

    switchTenant: (tenantId) => {
      const tenant = get().tenants.find((t) => t.id === tenantId);
      if (!tenant || tenantId === get().activeTenantId) return;
      set({ activeTenantId: tenantId });
      get().pushToast({
        title: `Viewing as ${tenant.name}`,
        body: tenant.descriptor,
        tone: 'teal',
      });
    },

    switchRole: (role) => set({ role, roleBannerDismissed: role === 'Owner' }),
    dismissRoleBanner: () => set({ roleBannerDismissed: true }),
    setCommandBarOpen: (open) => set({ commandBarOpen: open }),
    setDockOpen: (open) => set({ dockOpen: open }),

    setAutonomy: (workflow, level) => {
      set((s) => ({ autonomy: { ...s.autonomy, [workflow]: level } }));
      get().pushToast({ title: `Autonomy · ${workflow}: ${level}`, body: 'Guardrails still apply', tone: 'teal' });
    },

    // ----- toasts -----
    pushToast: (t) =>
      set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id: uid('t'), createdAt: Date.now() }] })),
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // ----- learning loop -----
    confirmFact: (factId) => {
      let updated: MemoryFact | undefined;
      set((s) => ({
        memoryFacts: s.memoryFacts.map((f) => {
          if (f.id !== factId) return f;
          updated = {
            ...f,
            status: 'active',
            confidence: Math.min(99, f.confidence + 4),
            evidenceCount: f.evidenceCount + 1,
            updatedAt: 'just now',
          };
          return updated;
        }),
      }));
      if (updated) {
        learnedToast(updated);
        writeLedger({
          tenantId: updated.tenantId, actor: 'user', actorName: ownerName(updated.tenantId),
          action: `Confirmed memory: ${updated.label}`, verdict: 'approved',
          verdictLabel: `confirmed by ${ownerName(updated.tenantId)}`, confidence: updated.confidence,
          reversible: false,
        });
      }
    },

    correctFact: (factId, correction) => {
      let updated: MemoryFact | undefined;
      set((s) => ({
        memoryFacts: s.memoryFacts.map((f) => {
          if (f.id !== factId) return f;
          updated = {
            ...f,
            label: correction.trim() || f.label,
            value: correction.trim() || f.value,
            status: 'active',
            confidence: Math.min(97, Math.max(f.confidence, 70)),
            evidence: [...f.evidence, 'corrected by you · just now'],
            updatedAt: 'just now',
          };
          return updated;
        }),
      }));
      if (updated) {
        learnedToast(updated);
        writeLedger({
          tenantId: updated.tenantId, actor: 'user', actorName: ownerName(updated.tenantId),
          action: `Corrected memory → ${updated.label}`, verdict: 'approved',
          verdictLabel: `corrected by ${ownerName(updated.tenantId)}`, confidence: updated.confidence,
          reversible: false,
        });
      }
    },

    forgetFact: (factId) => {
      const fact = get().memoryFacts.find((f) => f.id === factId);
      set((s) => ({
        memoryFacts: s.memoryFacts.map((f) => (f.id === factId ? { ...f, status: 'archived' } : f)),
      }));
      if (fact) {
        get().pushToast({ title: 'Fact forgotten', body: fact.label, tone: 'ember' });
        writeLedger({
          tenantId: fact.tenantId, actor: 'user', actorName: ownerName(fact.tenantId),
          action: `Forgot memory: ${fact.label}`, verdict: 'approved',
          verdictLabel: `forgotten by ${ownerName(fact.tenantId)}`, reversible: false,
        });
      }
    },

    teachFact: ({ label, value, kind }) => {
      const tenantId = get().activeTenantId;
      const fact: MemoryFact = {
        id: uid('f'), tenantId, kind: kind ?? 'rule', label,
        value: value ?? label, confidence: 55,
        evidence: ['taught by you · just now'], evidenceCount: 1,
        source: 'you', status: 'unreviewed', updatedAt: 'just now',
      };
      set((s) => ({ memoryFacts: [fact, ...s.memoryFacts] }));
      learnedToast(fact);
      writeLedger({
        tenantId, actor: 'user', actorName: ownerName(tenantId),
        action: `Taught: ${label}`, verdict: 'approved',
        verdictLabel: `taught by ${ownerName(tenantId)}`, confidence: 55, reversible: false,
      });
      return fact;
    },

    // ----- governance -----
    checkPolicy: ({ kind, amountUsd, marginPct, lane, docClass, hour }) => {
      const s = get();
      const policies = s.policies.filter((p) => p.tenantId === s.activeTenantId && p.enabled);
      const find = (k: Policy['kind']) => policies.find((p) => p.kind === k);

      if (kind === 'quote') {
        const p = find('margin-floor');
        const pct = Number(p?.params.pct ?? 12);
        if (marginPct !== undefined && marginPct < pct) {
          return { verdict: 'block', reason: `Blocked: margin ${marginPct}% is below your cost + ${pct}% floor`, policyId: p?.id };
        }
        return { verdict: 'auto', reason: `Margin is above your cost + ${pct}% floor`, policyId: p?.id };
      }
      if (kind === 'expense') {
        if (docClass === 'regulated') {
          return { verdict: 'escalate', reason: 'Document class is regulated — requires human approval even inside spend guardrail', policyId: find('spend-cap')?.id };
        }
        const p = find('spend-cap');
        const max = Number(p?.params.maxUsd ?? 200);
        if ((amountUsd ?? 0) <= max) return { verdict: 'auto', reason: `$${amountUsd} is inside the ≤$${max} auto-approve guardrail`, policyId: p?.id };
        return { verdict: 'escalate', reason: `$${amountUsd} exceeds the ≤$${max} auto-approve guardrail`, policyId: p?.id };
      }
      if (kind === 'bid') {
        const p = find('bid-floor');
        const min = Number(p?.params.minUsd ?? 1600);
        if ((amountUsd ?? 0) >= min) return { verdict: 'auto', reason: `$${amountUsd} is inside your $${min} bid floor${lane ? ` (${lane})` : ''}`, policyId: p?.id };
        return { verdict: 'escalate', reason: `$${amountUsd} is below your $${min} bid floor — needs approval`, policyId: p?.id };
      }
      if (kind === 'message') {
        const h = hour ?? new Date().getHours();
        if (h >= 7 && h < 21) return { verdict: 'auto', reason: 'Inside the 07:00–21:00 EAT customer-update window', policyId: find('time-window')?.id };
        return { verdict: 'escalate', reason: 'Outside the 07:00–21:00 EAT customer-update window', policyId: find('time-window')?.id };
      }
      return { verdict: 'auto', reason: 'No policy conflicts' };
    },

    approveAction: (actionId) => {
      const s = get();
      if (!s.can('approve')) {
        get().pushToast({ title: 'Not permitted', body: 'Approvals need an Owner or Finance sign-in', tone: 'danger' });
        return;
      }
      const action = s.approvals.find((a) => a.id === actionId);
      if (!action || action.status !== 'pending') return;
      const owner = ownerName(action.tenantId);

      set((st) => ({ approvals: st.approvals.map((a) => (a.id === actionId ? { ...a, status: 'approved' } : a)) }));

      let undo: LedgerEntry['undo'];

      if (action.kind === 'expense' && action.payload?.docId && action.movementId) {
        const docId = String(action.payload.docId);
        set((st) => ({
          movements: st.movements.map((m) => {
            if (m.id !== action.movementId) return m;
            return {
              ...m,
              exceptionNote: undefined,
              docs: m.docs.map((d) => (d.id === docId ? { ...d, status: 'verified', expiresInHours: undefined } : d)),
            };
          }),
        }));
        undo = { kind: 'doc-status', refId: `${action.movementId}:${docId}` };
      } else if (action.kind === 'bid' && action.exchangeLoadId) {
        set((st) => ({
          exchangeLoads: st.exchangeLoads.map((l) =>
            l.id === action.exchangeLoadId ? { ...l, status: 'bidding', ourBid: action.amount } : l,
          ),
        }));
        undo = { kind: 'bid', refId: action.exchangeLoadId };
      } else if (action.kind === 'exchange-post' && action.payload) {
        get().postCapacity({
          from: String(action.payload.from), to: String(action.payload.to),
          date: String(action.payload.date), vehiclePlate: String(action.payload.vehiclePlate),
        });
      }

      const entry = writeLedger({
        tenantId: action.tenantId, actor: 'user', actorName: owner,
        action: `${action.title}`, verdict: 'approved', verdictLabel: `approved by ${owner}`,
        confidence: action.confidence, reversible: action.reversible, reasoning: action.reasoning, undo,
      }, { title: action.title, tone: 'ok' });
      void entry;
    },

    rejectAction: (actionId) => {
      const action = get().approvals.find((a) => a.id === actionId);
      if (!action || action.status !== 'pending') return;
      set((st) => ({ approvals: st.approvals.map((a) => (a.id === actionId ? { ...a, status: 'rejected' } : a)) }));
      writeLedger({
        tenantId: action.tenantId, actor: 'user', actorName: ownerName(action.tenantId),
        action: `Rejected: ${action.title}`, verdict: 'rejected',
        verdictLabel: `rejected by ${ownerName(action.tenantId)}`, reversible: false,
      }, { title: `Rejected: ${action.title}`, tone: 'danger' });
    },

    undoLedgerEntry: (entryId) => {
      const s = get();
      const entry = s.ledger.find((e) => e.id === entryId);
      if (!entry || !entry.reversible || entry.undone) return;

      if (entry.undo?.kind === 'doc-status') {
        const [movementId, docId] = entry.undo.refId.split(':');
        set((st) => ({
          movements: st.movements.map((m) =>
            m.id === movementId
              ? { ...m, docs: m.docs.map((d) => (d.id === docId ? { ...d, status: 'expiring', expiresInHours: 36 } : d)) }
              : m,
          ),
        }));
      } else if (entry.undo?.kind === 'bid') {
        set((st) => ({
          exchangeLoads: st.exchangeLoads.map((l) =>
            l.id === entry.undo!.refId ? { ...l, status: 'open', ourBid: undefined } : l,
          ),
        }));
      }

      set((st) => ({ ledger: st.ledger.map((e) => (e.id === entryId ? { ...e, undone: true } : e)) }));
      writeLedger({
        tenantId: entry.tenantId, actor: 'user', actorName: ownerName(entry.tenantId),
        action: `Undid: ${entry.action}`, verdict: 'undone', verdictLabel: 'undone · reversed', reversible: false,
      }, { title: 'Action undone', body: entry.action, tone: 'ember' });
    },

    // ----- intelligence engines -----
    suggestPrice: ({ from, to }) => {
      const s = get();
      const key = laneKey(from, to);
      const fact = s.memoryFacts.find(
        (f) => f.tenantId === s.activeTenantId && f.kind === 'lane' && f.status !== 'archived'
          && f.label.toLowerCase().replace(/\s+/g, '').includes(key),
      );
      const currency: Currency = s.activeTenantId === 'savannah' ? 'GHS' : 'USD';
      if (fact) {
        const avg = Number(fact.value) || 1800;
        const band: [number, number] = [Math.round(avg * 0.92), Math.round(avg * 1.08)];
        const reasoning = fact.confidence >= 60
          ? `Avg of ${fact.evidenceCount} moves · ${fact.evidence[0] ?? 'recent history'} · win-rate 71% within +5% of avg`
          : `Only ${fact.evidenceCount} moves on record — treat as an estimate, not a rate`;
        return { price: { amount: avg, currency }, band, reasoning, confidence: fact.confidence, factId: fact.id };
      }
      return {
        price: { amount: 1500, currency },
        band: [1200, 1900],
        reasoning: 'No memory for this lane yet — priced from the regional average. Confirm a rate and I’ll learn it.',
        confidence: 30,
      };
    },

    fitScore: (load) => {
      const s = get();
      let score = 20;
      const reasons: string[] = [];
      const lane = laneKey(load.from, load.to);
      const laneFact = s.memoryFacts.find(
        (f) => f.kind === 'lane' && f.label.toLowerCase().replace(/\s+/g, '').includes(lane),
      );
      if (laneFact) { score += 40; reasons.push(`known lane ◈ ${laneFact.label}`); }
      const returning = s.fleet.some((v) => v.tenantId === s.activeTenantId && (v.status === 'en-route' || v.status === 'available'));
      if (returning) { score += 20; reasons.push('matches a returning/available unit'); }
      if (/thu|fri|wed/i.test(load.date)) { score += 10; reasons.push(`date fits this week’s window (${load.date})`); }
      if (load.weightT <= 24) { score += 5; reasons.push(`${load.weightT}t within fleet capacity`); }
      const floor = s.policies.find((p) => p.kind === 'bid-floor' && p.enabled);
      if (floor && load.price.amount >= Number(floor.params.minUsd ?? 0)) { score += 2; reasons.push('above your bid floor'); }
      return { score: Math.min(97, score), reasons };
    },

    parseIntent: (text) => {
      const s = get();
      const q = text.trim().toLowerCase();
      const tenantMovements = s.movements.filter((m) => m.tenantId === s.activeTenantId);

      if (q.startsWith('teach')) {
        return { type: 'teach', text: text.replace(/^teach:?\s*/i, '').trim() };
      }
      if (q.startsWith('quote') || q.startsWith('new quote')) {
        const body = q.replace(/^new quote|^quote/, '').trim();
        const weightMatch = body.match(/(\d+)\s*t\b/);
        const routeMatch = body.match(/([a-z ]+?)\s+to\s+([a-z ]+?)(?:\s+on|\s+for|\s+next|\s+this|$)/);
        const forMatch = body.match(/\bfor\s+([a-z ]+)$/);
        const dayMatch = body.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/);
        const from = routeMatch ? titleCase(routeMatch[1].replace(/\d+\s*t\b/, '').trim()) : '';
        const to = routeMatch ? titleCase(routeMatch[2].trim()) : '';
        const draft = {
          from, to,
          weightT: weightMatch ? Number(weightMatch[1]) : 12,
          customer: forMatch ? titleCase(forMatch[1].trim()) : undefined,
          day: dayMatch ? titleCase(dayMatch[1]) : undefined,
          cargo: 'General cargo',
        };
        const suggestion = from && to ? s.suggestPrice({ from, to }) : null;
        return { type: 'quote', draft, suggestion };
      }
      if (q.startsWith('where is') || q.startsWith('track')) {
        const plate = s.fleet.find((v) => q.includes(v.plate.toLowerCase()));
        if (plate) {
          const movement = tenantMovements.find((m) => m.vehiclePlate === plate.plate);
          return { type: 'track', vehicle: plate, movement };
        }
        return { type: 'unknown', text: 'No vehicle matched — try a plate like KDJ 482T' };
      }
      if (q.startsWith('approve')) {
        const pending = s.approvals.filter((a) => a.tenantId === s.activeTenantId && a.status === 'pending');
        const underMatch = q.match(/under\s+\$?([\d,]+)/);
        const actions = underMatch
          ? pending.filter((a) => (a.amount?.amount ?? Infinity) < Number(underMatch[1].replace(',', '')))
          : pending;
        return { type: 'approve', actions, batchNote: underMatch ? `batch · under $${underMatch[1]}` : undefined };
      }
      if (q.startsWith('post capacity') || q.startsWith('post')) {
        const routeMatch = q.match(/([a-z ]+?)\s+to\s+([a-z ]+?)(?:\s+on|\s+thu|\s+wed|\s+fri|$)/);
        const dayMatch = q.match(/\b(mon|tue|wed|thu|fri)\w*/);
        return {
          type: 'post-capacity',
          draft: {
            from: routeMatch ? titleCase(routeMatch[1].replace('post capacity', '').trim()) : 'Kampala',
            to: routeMatch ? titleCase(routeMatch[2].trim()) : 'Nairobi',
            date: dayMatch ? `${titleCase(dayMatch[1])} 16 May` : 'Thu 16 May',
          },
        };
      }
      if (q.startsWith('dispatch') || q.startsWith('assign')) {
        const movement = tenantMovements.find((m) => q.includes(m.id.toLowerCase()))
          ?? tenantMovements.find((m) => !m.vehiclePlate && m.status === 'Booked');
        return { type: 'dispatch', movement };
      }
      if (q.startsWith('summarize') || q.startsWith('summary')) {
        const active = tenantMovements.filter((m) => ['In Transit', 'At Border', 'Exception'].includes(m.status)).length;
        const pending = s.approvals.filter((a) => a.tenantId === s.activeTenantId && a.status === 'pending').length;
        return { type: 'summarize', text: `${active} movements live · ${pending} approvals waiting · margin this week tracking +8% over last.` };
      }
      if (q.startsWith('find') || q.startsWith('show') || q.length > 0) {
        const term = q.replace(/^(find|show)\s*/, '');
        const results: { kind: 'movement' | 'quote' | 'fact'; id: string; label: string }[] = [];
        if (term) {
          tenantMovements.forEach((m) => {
            const hay = `${m.id} ${m.from} ${m.to} ${m.customer} ${m.status}`.toLowerCase();
            if (hay.includes(term)) results.push({ kind: 'movement', id: m.id, label: `${m.id} · ${m.from} → ${m.to} · ${m.status}` });
          });
          s.quotes.filter((x) => x.tenantId === s.activeTenantId).forEach((x) => {
            if (`${x.id} ${x.customer} ${x.from} ${x.to}`.toLowerCase().includes(term))
              results.push({ kind: 'quote', id: x.id, label: `${x.id} · ${x.customer} · ${x.from} → ${x.to}` });
          });
          s.memoryFacts.filter((f) => f.tenantId === s.activeTenantId && f.status !== 'archived').forEach((f) => {
            if (f.label.toLowerCase().includes(term)) results.push({ kind: 'fact', id: f.id, label: `◈ ${f.label}` });
          });
        }
        return { type: 'find', results: results.slice(0, 6) };
      }
      return { type: 'unknown', text: 'Try: quote · track · teach · approve · summarize · post capacity' };
    },

    // ----- mutations -----
    addQuoteFromIntent: (draft, suggestion) => {
      const s = get();
      const tenantId = s.activeTenantId;
      const currency: Currency = tenantId === 'savannah' ? 'GHS' : 'USD';
      const price = suggestion?.price ?? { amount: 1500, currency };
      const cost = { amount: Math.round(price.amount * 0.82), currency };
      const quote: Quote = {
        id: `Q-${313 + s.quotes.filter((q) => q.tenantId === tenantId).length}`,
        tenantId,
        customer: draft.customer ?? 'Unspecified customer',
        from: draft.from, to: draft.to, cargo: draft.cargo, weightT: draft.weightT,
        price, cost, marginPct: 22, status: 'draft', openCount: 0,
        confidence: suggestion?.confidence ?? 30, memoryFactId: suggestion?.factId,
        winProbability: suggestion && suggestion.confidence > 60 ? 68 : 40,
        pickupDate: draft.pickupDate, createdBy: 'conductor',
        lastActivity: 'drafted by Conductor just now',
      };
      set((st) => ({ quotes: [quote, ...st.quotes] }));
      const check = s.checkPolicy({ kind: 'quote', marginPct: quote.marginPct });
      writeLedger({
        tenantId, actor: 'conductor', actorName: 'Conductor',
        action: `Drafted quote ${quote.id} · ${laneLabel(draft.from, draft.to)} ${fmtMoney(price)}`,
        verdict: 'auto', verdictLabel: `auto · ${check.reason}`, confidence: quote.confidence,
        reversible: false, reasoning: suggestion ? [suggestion.reasoning] : undefined,
      }, { title: `Quote ${quote.id} drafted`, body: `${laneLabel(draft.from, draft.to)} · ${fmtMoney(price)}`, tone: 'teal' });
      return quote;
    },

    convertQuoteToMovement: (quoteId) => {
      const s = get();
      const quote = s.quotes.find((q) => q.id === quoteId);
      if (!quote) return undefined;
      const movement: Movement = {
        id: `${s.activeTenantId === 'savannah' ? 'SV' : 'MR'}-${2486 + s.movements.length}`,
        tenantId: quote.tenantId, from: quote.from, to: quote.to,
        status: 'Booked', cargo: quote.cargo, weightT: quote.weightT, customer: quote.customer,
        legs: [{ id: uid('leg'), seq: 1, from: quote.from, to: quote.to, mode: 'road-ftl', status: 'planned' }],
        borders: [], docs: [], price: quote.price, cost: quote.cost,
        moneyEvents: [], milestones: [
          { id: uid('m'), label: `Pickup ${quote.from}`, time: quote.pickupDate ?? 'TBD', status: 'upcoming' },
          { id: uid('m'), label: `Deliver ${quote.to}`, time: 'TBD', status: 'upcoming' },
        ],
        parties: [{ name: quote.customer, role: 'shipper' }],
        progress: 0, flags: [], quoteId: quote.id,
      };
      set((st) => ({
        movements: [movement, ...st.movements],
        quotes: st.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'won' } : q)),
      }));
      writeLedger({
        tenantId: quote.tenantId, actor: 'user', actorName: ownerName(quote.tenantId),
        action: `Converted ${quote.id} → movement ${movement.id}`, verdict: 'approved',
        verdictLabel: `converted by ${ownerName(quote.tenantId)}`, reversible: false,
      }, { title: `${quote.id} is now ${movement.id}`, body: 'materialized as a Movement', tone: 'ok' });
      return movement;
    },

    addInquiry: (input) => {
      const s = get();
      const tenantId = s.activeTenantId;
      const inq: Inquiry = {
        id: uid('inq'), tenantId, customer: input.customer, from: input.from, to: input.to,
        cargo: input.cargo, weightT: input.weightT, channel: input.channel, note: input.note,
        receivedAt: nowTime(), status: 'new',
      };
      set((st) => ({ inquiries: [inq, ...st.inquiries] }));
      writeLedger({
        tenantId, actor: 'user', actorName: sessionName(s.people, s.sessionUserId, tenantId),
        action: `Inquiry logged · ${inq.customer} ${laneLabel(inq.from, inq.to)} ${inq.weightT}t (${inq.channel})`,
        verdict: 'approved', verdictLabel: `received by ${ownerName(tenantId)}`, reversible: false,
      }, { title: `Inquiry from ${inq.customer}`, body: `${laneLabel(inq.from, inq.to)} · ${inq.weightT}t · triage in Quotes`, tone: 'teal' });
      return inq;
    },

    closeInquiry: (inquiryId) => {
      const s = get();
      const inq = s.inquiries.find((i) => i.id === inquiryId);
      if (!inq) return;
      set((st) => ({ inquiries: st.inquiries.map((i) => (i.id === inquiryId ? { ...i, status: 'closed' } : i)) }));
      writeLedger({
        tenantId: inq.tenantId, actor: 'user', actorName: sessionName(s.people, s.sessionUserId, inq.tenantId),
        action: `Closed inquiry from ${inq.customer} (${laneLabel(inq.from, inq.to)})`,
        verdict: 'approved', verdictLabel: 'closed · no quote', reversible: false,
      });
    },

    quoteFromInquiry: (inquiryId) => {
      const s = get();
      const inq = s.inquiries.find((i) => i.id === inquiryId);
      if (!inq || inq.status === 'quoted') return undefined;
      const tenantId = inq.tenantId;
      const currency: Currency = tenantId === 'savannah' ? 'GHS' : 'USD';
      const suggestion = s.suggestPrice({ from: inq.from, to: inq.to }, inq.cargo);
      const price = suggestion?.price ?? { amount: Math.round(inq.weightT * 68), currency };
      const cost = { amount: Math.round(price.amount * 0.82), currency };
      const marginPct = Math.round(((price.amount - cost.amount) / price.amount) * 100);
      const quote: Quote = {
        id: tenantId === 'savannah'
          ? `Q-SV-${3 + s.quotes.filter((q) => q.tenantId === 'savannah').length}`
          : `Q-${313 + s.quotes.filter((q) => q.tenantId === 'meridian').length}`,
        tenantId, customer: inq.customer, from: inq.from, to: inq.to,
        cargo: inq.cargo, weightT: inq.weightT,
        price, cost, marginPct,
        status: 'draft', openCount: 0,
        confidence: suggestion?.confidence ?? 45, memoryFactId: suggestion?.factId,
        winProbability: suggestion && suggestion.confidence > 60 ? 68 : 42,
        createdBy: 'user', lastActivity: `drafted from ${inq.channel} inquiry`,
      };
      set((st) => ({
        quotes: [quote, ...st.quotes],
        inquiries: st.inquiries.map((i) => (i.id === inquiryId ? { ...i, status: 'quoted', quoteId: quote.id } : i)),
      }));
      writeLedger({
        tenantId, actor: 'user', actorName: sessionName(s.people, s.sessionUserId, tenantId),
        action: `Drafted ${quote.id} from ${inq.customer} inquiry · ${laneLabel(inq.from, inq.to)} ${fmtMoney(price)}`,
        verdict: 'approved', verdictLabel: `drafted by ${sessionName(s.people, s.sessionUserId, tenantId)}`, confidence: quote.confidence,
        reversible: false, reasoning: suggestion ? [suggestion.reasoning] : undefined,
      }, { title: `${quote.id} drafted from inquiry`, body: `${inq.customer} · ${fmtMoney(price)} · review and send`, tone: 'ok' });
      return quote;
    },

    markQuoteWon: (quoteId) => {
      const s = get();
      const q = s.quotes.find((x) => x.id === quoteId);
      if (!q || q.status === 'won') return;
      set((st) => ({ quotes: st.quotes.map((x) => (x.id === quoteId ? { ...x, status: 'won', lastActivity: 'marked won' } : x)) }));
      writeLedger({
        tenantId: q.tenantId, actor: 'user', actorName: sessionName(s.people, s.sessionUserId, q.tenantId),
        action: `${q.id} won · ${q.customer} ${laneLabel(q.from, q.to)} ${fmtMoney(q.price)}`,
        verdict: 'approved', verdictLabel: `won by ${sessionName(s.people, s.sessionUserId, q.tenantId)}`, reversible: false,
      });
    },

    markQuoteLost: (quoteId, reason) => {
      const s = get();
      const q = s.quotes.find((x) => x.id === quoteId);
      if (!q || q.status === 'lost') return;
      set((st) => ({ quotes: st.quotes.map((x) => (x.id === quoteId ? { ...x, status: 'lost', lastActivity: `lost · ${reason}` } : x)) }));
      writeLedger({
        tenantId: q.tenantId, actor: 'user', actorName: sessionName(s.people, s.sessionUserId, q.tenantId),
        action: `${q.id} lost · ${q.customer} ${laneLabel(q.from, q.to)} — ${reason}`,
        verdict: 'approved', verdictLabel: `lost · ${reason}`, reversible: false,
      }, { title: `${q.id} marked lost`, body: reason, tone: 'ember' });
    },

    assignDriver: (movementId, vehicleId) => {
      const s = get();
      const vehicle = s.fleet.find((v) => v.id === vehicleId);
      const movement = s.movements.find((m) => m.id === movementId);
      if (!vehicle || !movement) return;
      const driver = s.drivers.find((d) => d.id === vehicle.driverId);
      set((st) => ({
        movements: st.movements.map((m) =>
          m.id === movementId
            ? {
                ...m,
                vehiclePlate: vehicle.plate,
                driverName: driver?.name,
                exceptionNote: undefined,
                legs: m.legs.map((l, i) => (i === 0 ? { ...l, vehiclePlate: vehicle.plate, driverName: driver?.name } : l)),
              }
            : m,
        ),
        fleet: st.fleet.map((v) => (v.id === vehicleId ? { ...v, status: 'en-route' } : v)),
      }));
      writeLedger({
        tenantId: movement.tenantId, actor: 'user', actorName: ownerName(movement.tenantId),
        action: `Assigned ${vehicle.plate}${driver ? ` · ${driver.name}` : ''} to ${movementId}`,
        verdict: 'approved', verdictLabel: `assigned by ${ownerName(movement.tenantId)}`, reversible: false,
        reasoning: [`${vehicle.model} compatible with ${movement.weightT}t ${movement.cargo}`, 'Hours-of-service clear'],
      }, { title: `${vehicle.plate} → ${movementId}`, tone: 'ok' });
    },

    startTrip: (movementId) => {
      const s = get();
      const m = s.movements.find((x) => x.id === movementId);
      if (!m || m.status !== 'Booked') return;
      if (!m.vehiclePlate) {
        get().pushToast({ title: 'No vehicle assigned', body: 'Assign a truck & driver in Dispatch first', tone: 'ember' });
        return;
      }
      if (!s.can('assign')) {
        get().pushToast({ title: 'Not permitted', body: 'Departures need an Owner or Dispatcher sign-in', tone: 'danger' });
        return;
      }
      const name = sessionName(s.people, s.sessionUserId, m.tenantId);
      set((st) => ({
        movements: st.movements.map((x) =>
          x.id === movementId
            ? {
                ...x,
                status: 'In Transit',
                progress: 0.05,
                pickupIn: undefined,
                nextMilestone: x.milestones[1]?.label ?? `Deliver ${x.to}`,
                nextMilestoneInH: x.milestones[1] ? x.nextMilestoneInH : undefined,
                milestones: x.milestones.map((ms, i) =>
                  i === 0 ? { ...ms, label: ms.label.startsWith('Pickup') ? ms.label.replace('Pickup', 'Departed') : ms.label, time: nowTime(), status: 'done' }
                    : i === 1 ? { ...ms, status: 'current' } : ms,
                ),
              }
            : x,
        ),
        drivers: st.drivers.map((d) => (d.name === m.driverName ? { ...d, status: 'driving' } : d)),
      }));
      writeLedger({
        tenantId: m.tenantId, actor: 'user', actorName: name,
        action: `Departed ${m.from} · ${movementId} · ${m.vehiclePlate}${m.driverName ? ` · ${m.driverName}` : ''}`,
        verdict: 'approved', verdictLabel: `departed · logged by ${name}`, reversible: false,
        reasoning: ['Pre-trip inspection logged', `${m.docs.filter((d) => d.status === 'verified').length}/${m.docs.length} docs verified on board`, 'Hours-of-service clear'],
      }, { title: `${movementId} departed ${m.from}`, body: `${m.vehiclePlate} · next: ${m.milestones[1]?.label ?? m.to}`, tone: 'ok' });
    },

    sendQuote: (quoteId) => {
      const quote = get().quotes.find((q) => q.id === quoteId);
      if (!quote) return;
      set((st) => ({
        quotes: st.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'sent', sentAt: nowTime(), lastActivity: 'sent just now' } : q)),
      }));
      writeLedger({
        tenantId: quote.tenantId, actor: 'user', actorName: ownerName(quote.tenantId),
        action: `Sent quote ${quote.id} to ${quote.customer} · ${fmtMoney(quote.price)}`,
        verdict: 'approved', verdictLabel: `sent by ${ownerName(quote.tenantId)}`,
        confidence: quote.confidence, reversible: false,
      }, { title: `Quote ${quote.id} sent`, body: `${quote.customer} · ${fmtMoney(quote.price)}`, tone: 'ok' });
    },

    postCapacity: ({ from, to, date, vehiclePlate }) => {
      const tenantId = get().activeTenantId;
      const cap: ExchangeCapacity = { id: uid('cap'), tenantId, from, to, date, vehiclePlate, status: 'posted' };
      set((st) => ({ exchangeCapacity: [cap, ...st.exchangeCapacity] }));
      writeLedger({
        tenantId, actor: 'conductor', actorName: 'Conductor',
        action: `Posted capacity ${vehiclePlate} · ${laneLabel(from, to)} · ${date} to Exchange`,
        verdict: 'approved', verdictLabel: `approved by ${ownerName(tenantId)}`, reversible: true,
      }, { title: 'Capacity posted to Exchange', body: `${vehiclePlate} · ${laneLabel(from, to)}`, tone: 'teal' });
      return cap;
    },

    placeBid: (loadId, amount) => {
      const s = get();
      const load = s.exchangeLoads.find((l) => l.id === loadId);
      if (!load) return { verdict: 'block', reason: 'Load not found' };
      const check = s.checkPolicy({ kind: 'bid', amountUsd: amount, lane: laneLabel(load.from, load.to) });
      if (check.verdict === 'auto') {
        set((st) => ({
          exchangeLoads: st.exchangeLoads.map((l) =>
            l.id === loadId ? { ...l, status: 'bidding', ourBid: { amount, currency: load.price.currency } } : l,
          ),
        }));
        writeLedger({
          tenantId: s.activeTenantId, actor: 'conductor', actorName: 'Conductor',
          action: `Bid ${fmtMoney({ amount, currency: load.price.currency })} on ${laneLabel(load.from, load.to)} · ${load.poster}`,
          verdict: 'auto', verdictLabel: 'auto · inside policy', reversible: true,
          undo: { kind: 'bid', refId: loadId },
        }, { title: 'Bid placed', body: `${laneLabel(load.from, load.to)} · ${fmtMoney({ amount, currency: load.price.currency })}`, tone: 'teal' });
      } else if (check.verdict === 'escalate') {
        const action: ApprovalAction = {
          id: uid('ap'), tenantId: s.activeTenantId,
          title: `Bid ${fmtMoney({ amount, currency: load.price.currency })} on ${laneLabel(load.from, load.to)}`,
          context: `${load.cargo} · ${load.date} · ${load.poster}`,
          kind: 'bid', reasoning: [check.reason], citedFactIds: [],
          impacts: [], confidence: 60, status: 'pending', createdAt: nowTime(),
          amount: { amount, currency: load.price.currency }, exchangeLoadId: loadId, reversible: true,
        };
        set((st) => ({ approvals: [action, ...st.approvals] }));
        writeLedger({
          tenantId: s.activeTenantId, actor: 'conductor', actorName: 'Conductor',
          action: `Escalated bid · ${check.reason}`, verdict: 'escalated',
          verdictLabel: 'escalated · awaiting approval', reversible: false,
        }, { title: 'Bid queued for approval', body: check.reason, tone: 'ember' });
      }
      return check;
    },

    resolveDockMessage: (id) =>
      set((st) => ({ dockMessages: st.dockMessages.map((m) => (m.id === id ? { ...m, resolved: true } : m)) })),

    // proactive event tick — idempotent, appends predictions/alerts once
    tick: () => {
      const s = get();
      set({ tickCount: s.tickCount + 1 });
      // simulate customer engagement: the oldest 'sent' quote gets opened
      const sent = s.quotes.filter((q) => q.status === 'sent');
      if (sent.length > 0) {
        const q = sent[sent.length - 1];
        set((st) => ({
          quotes: st.quotes.map((x) =>
            x.id === q.id
              ? { ...x, status: 'opened', openCount: x.openCount + 1, lastActivity: `Opened ${x.openCount + 1}x · tracking` }
              : x,
          ),
        }));
      }
      const tenantId = s.activeTenantId;
      if (tenantId !== 'meridian') return;
      const hasPrediction = s.dockMessages.some((m) => m.id === 'dm-tick-malaba');
      if (!hasPrediction) {
        const msg: DockMessage = {
          id: 'dm-tick-malaba', tenantId, kind: 'note',
          text: 'Malaba queue is draining faster than usual — MR-2481 now likely clears by 13:40. Bond renewal is still the only blocker.',
          sources: ['border telematics · live'], resolved: false, createdAt: nowTime(),
        };
        set((st) => ({ dockMessages: [...st.dockMessages, msg] }));
        get().pushToast({ title: 'Border prediction updated', body: 'MR-2481 likely clears Malaba by 13:40', tone: 'teal' });
      }
    },
  };
});

// ---------- store hook ----------
// Wrap every selector with useShallow so selectors that derive arrays/objects
// (e.g. `.filter(...)`) return a referentially stable snapshot — otherwise
// useSyncExternalStore sees a new snapshot each render and loops (React #185).
export const useStore = Object.assign(
  function useStore<T>(selector: (state: StoreState) => T): T {
    return baseStore(useShallow(selector));
  },
  baseStore,
);

// ---------- convenience hooks ----------

export const useActiveTenant = () =>
  useStore((s) => s.tenants.find((t) => t.id === s.activeTenantId) ?? s.tenants[0]);

export const useTenantMovements = () =>
  useStore((s) => s.movements.filter((m) => m.tenantId === s.activeTenantId));

export const usePendingApprovals = () =>
  useStore((s) => s.approvals.filter((a) => a.tenantId === s.activeTenantId && a.status === 'pending'));

export const useTenantFacts = () =>
  useStore((s) => s.memoryFacts.filter((f) => f.tenantId === s.activeTenantId && f.status !== 'archived'));

export const useTenantFleet = () =>
  useStore((s) => s.fleet.filter((v) => v.tenantId === s.activeTenantId));

export const useTenantQuotes = () =>
  useStore((s) => s.quotes.filter((q) => q.tenantId === s.activeTenantId));
export const useTenantInquiries = () =>
  useStore((s) => s.inquiries.filter((i) => i.tenantId === s.activeTenantId));

export const useTenantLedger = () =>
  useStore((s) => s.ledger.filter((e) => e.tenantId === s.activeTenantId));

export const useTenantDock = () =>
  useStore((s) => s.dockMessages.filter((m) => m.tenantId === s.activeTenantId));

export const useFact = (factId?: string) =>
  useStore((s) => s.memoryFacts.find((f) => f.id === factId));

function titleCase(str: string) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}