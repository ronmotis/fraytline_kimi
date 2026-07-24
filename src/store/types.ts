// Fraytline domain types — the single source of truth for the demo universe.
// Page agents: import everything from '@/store' (re-exported via index.ts).

export type Role = 'Owner' | 'Dispatcher' | 'Finance' | 'Driver' | 'Customer';

export type MovementStatus =
  | 'Draft' | 'Quoted' | 'Booked' | 'In Transit'
  | 'At Border' | 'Exception' | 'Delivered' | 'Settled';

export type Currency = 'KES' | 'UGX' | 'RWF' | 'USD' | 'GHS';

export interface Money {
  amount: number;
  currency: Currency;
}

export type DocStatus = 'verified' | 'pending' | 'expiring' | 'missing';

export interface Doc {
  id: string;
  name: string;
  status: DocStatus;
  expiresInHours?: number;
  /** fields the OS extracted — cited as memory evidence */
  fields?: { label: string; value: string }[];
}

export interface BorderCrossing {
  id: string;
  name: string;
  fromCountry: string;
  toCountry: string;
  status: 'upcoming' | 'waiting' | 'cleared';
  waitHours?: number;
  avgHours?: number;
  trend?: 'up' | 'down' | 'flat';
}

export interface Leg {
  id: string;
  seq: number;
  from: string;
  to: string;
  mode: 'road-ftl' | 'road-ltl';
  status: 'planned' | 'active' | 'done';
  vehiclePlate?: string;
  driverName?: string;
  partnerName?: string; // subcontractor handoff
  distanceKm?: number;
}

export interface Milestone {
  id: string;
  label: string;
  time: string;
  status: 'done' | 'current' | 'upcoming';
}

export interface Party {
  name: string;
  role: 'shipper' | 'consignee' | 'partner' | 'carrier' | 'driver' | 'notify';
  detail?: string;
}

export interface MoneyEvent {
  id: string;
  label: string;
  value: Money;
  status: 'pending' | 'done';
  kind: 'advance' | 'settlement' | 'fx' | 'tax' | 'invoice';
}

export interface Movement {
  id: string;
  tenantId: string;
  from: string;
  to: string;
  status: MovementStatus;
  cargo: string;
  weightT: number;
  customer: string;
  legs: Leg[];
  borders: BorderCrossing[];
  docs: Doc[];
  price: Money;
  cost?: Money;
  margin?: Money;
  moneyEvents: MoneyEvent[];
  milestones: Milestone[];
  parties: Party[];
  progress: number; // 0..1 along the route
  nextMilestone?: string;
  nextMilestoneInH?: number;
  vehiclePlate?: string;
  driverName?: string;
  exceptionNote?: string;
  flags: string[]; // jurisdiction chips e.g. ['KE','UG','RW']
  quoteId?: string;
  pickupIn?: string; // human countdown label e.g. '26h'
}

export type InquiryStatus = 'new' | 'triaged' | 'quoted' | 'closed';

export interface Inquiry {
  id: string;
  tenantId: string;
  customer: string;
  from: string;
  to: string;
  cargo: string;
  weightT: number;
  channel: 'email' | 'phone' | 'whatsapp' | 'portal';
  receivedAt: string;
  note?: string;
  status: InquiryStatus;
  quoteId?: string;
}

export interface Quote {
  id: string;
  tenantId: string;
  customer: string;
  from: string;
  to: string;
  cargo: string;
  weightT: number;
  price: Money;
  cost: Money;
  marginPct: number;
  status: 'draft' | 'sent' | 'opened' | 'won' | 'lost';
  openCount: number;
  sentAt?: string;
  lastActivity?: string;
  confidence: number;
  memoryFactId?: string;
  winProbability: number;
  pickupDate?: string;
  createdBy: 'conductor' | 'user';
}

export interface FleetUnit {
  id: string;
  tenantId: string;
  plate: string;
  model: string;
  status: 'en-route' | 'available' | 'service-due' | 'yard';
  location: string;
  driverId?: string;
  availableAt?: string;
  serviceDueDays?: number;
  /** position on the tenant map viewBox (1200x900) */
  coords: [number, number];
  heading?: number; // degrees
}

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  avatar?: string;
  status: 'driving' | 'resting' | 'available';
  hoursLeft: number;
  vehicleId?: string;
}

export type FactKind = 'lane' | 'border' | 'customer' | 'pattern' | 'partner' | 'pricing' | 'rule';
export type FactSource = 'you' | 'document' | 'behavior' | 'exchange';

export interface MemoryFact {
  id: string;
  tenantId: string;
  kind: FactKind;
  label: string; // short chip text e.g. 'Nairobi→Kampala avg $1,850'
  value: string; // canonical value e.g. '1850'
  confidence: number; // 0..100
  evidence: string[];
  evidenceCount: number;
  source: FactSource;
  status: 'active' | 'unreviewed' | 'archived';
  updatedAt: string;
}

export interface Policy {
  id: string;
  tenantId: string;
  label: string;
  kind: 'spend-cap' | 'margin-floor' | 'bid-floor' | 'notify' | 'block' | 'time-window';
  params: Record<string, number | string>;
  enabled: boolean;
}

export interface ApprovalAction {
  id: string;
  tenantId: string;
  title: string;
  context: string;
  kind: 'expense' | 'bid' | 'message' | 'exchange-post' | 'rule';
  reasoning: string[];
  citedFactIds: string[];
  impacts: { label: string; tone: 'ok' | 'ember' | 'teal' | 'danger' }[];
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  amount?: Money;
  movementId?: string;
  quoteId?: string;
  exchangeLoadId?: string;
  payload?: Record<string, unknown>;
  reversible: boolean;
}

export interface LedgerEntry {
  id: string;
  tenantId: string;
  time: string;
  actor: 'conductor' | 'user' | 'system';
  actorName: string;
  action: string;
  verdict: 'auto' | 'approved' | 'escalated' | 'rejected' | 'undone';
  verdictLabel: string;
  confidence?: number;
  reversible: boolean;
  undone: boolean;
  reasoning?: string[];
  /** optional inverse applied by undoLedgerEntry */
  undo?: { kind: string; refId: string; prev?: unknown };
}

export interface Person {
  id: string;
  tenantId: string;
  name: string;
  role: Role | 'Partner';
  title?: string;
  avatar?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  industry?: string;
  paymentDays?: number;
}

export interface ExchangeLoad {
  id: string;
  from: string;
  to: string;
  cargo: string;
  weightT: number;
  date: string;
  price: Money;
  poster: string;
  status: 'open' | 'bidding' | 'won' | 'lost';
  ourBid?: Money;
}

export interface ExchangeCapacity {
  id: string;
  tenantId: string;
  from: string;
  to: string;
  date: string;
  vehiclePlate: string;
  status: 'draft' | 'posted' | 'matched';
}

export interface Tenant {
  id: string;
  name: string;
  logo: string;
  hq: string;
  branch: string;
  descriptor: string; // toast line e.g. '4 trucks · local'
  scale: 'multinational' | 'local';
  currencies: Currency[];
  mapAsset: string;
  trucks: number;
}

export type AutonomyLevel = 'Manual' | 'Suggest' | 'Approve' | 'Autonomous';

/** permission capabilities checked via store.can() */
export type Capability =
  | 'approve'      // approve/reject governance actions
  | 'assign'       // dispatch: assign vehicles & drivers
  | 'bid'          // exchange: bid on loads, post capacity
  | 'settle'       // finance: record payments, settle movements
  | 'admin'        // settings: users, security, flags, data
  | 'audit.undo';  // undo reversible ledger entries

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: 'ok' | 'ember' | 'teal' | 'danger';
  ledgerLink?: boolean;
  undoEntryId?: string;
  createdAt: number;
}

export interface DockMessage {
  id: string;
  tenantId: string;
  kind: 'brief' | 'suggestion' | 'learning' | 'note';
  text: string;
  sources?: string[];
  actionId?: string;
  factIds?: string[];
  resolved: boolean;
  createdAt: string;
}

// ---- Conductor engine result types ----

export interface PolicyCheck {
  verdict: 'auto' | 'escalate' | 'block';
  reason: string;
  policyId?: string;
}

export interface PriceSuggestion {
  price: Money;
  band: [number, number];
  reasoning: string;
  confidence: number;
  factId?: string;
}

export interface FitResult {
  score: number; // 0..100
  reasons: string[];
}

export type IntentResult =
  | { type: 'quote'; draft: { from: string; to: string; weightT: number; customer?: string; day?: string; cargo: string }; suggestion: PriceSuggestion | null }
  | { type: 'track'; vehicle: FleetUnit; movement?: Movement }
  | { type: 'teach'; text: string }
  | { type: 'approve'; actions: ApprovalAction[]; batchNote?: string }
  | { type: 'find'; results: { kind: 'movement' | 'quote' | 'fact'; id: string; label: string }[] }
  | { type: 'dispatch'; movement?: Movement }
  | { type: 'summarize'; text: string }
  | { type: 'post-capacity'; draft: { from: string; to: string; date: string; vehiclePlate?: string } }
  | { type: 'unknown'; text: string };