// Exchange page-local data & helpers (exchange.md). Store loads stay canonical;
// these supplemental loads round out each tenant's regional board per spec.
import { useStore } from '@/store';
import type { ExchangeLoad, FitResult, MemoryFact, Money } from '@/store';

// ---------- regional slices (one product, different network slice) ----------

export const EA_CITIES = ['Nairobi', 'Mombasa', 'Kampala', 'Kigali', 'Juba', 'Dar es Salaam'];
export const WA_CITIES = ['Accra', 'Kumasi', 'Tema', 'Takoradi', 'Ouagadougou', 'Paga'];

export const inRegion = (tenantId: string, city: string) =>
  (tenantId === 'savannah' ? WA_CITIES : EA_CITIES).includes(city);

/** Supplemental board cards per exchange.md §2 / Role & Tenant Variations. */
export const EXTRA_LOADS: Record<string, ExchangeLoad[]> = {
  meridian: [
    { id: 'xl-x1', from: 'Nairobi', to: 'Mombasa', cargo: 'Packaged goods — 8t', weightT: 8, date: 'Fri 17 May', price: { amount: 1250, currency: 'USD' }, poster: 'Rift Valley Freighters', status: 'open' },
    { id: 'xl-x2', from: 'Mombasa', to: 'Kampala', cargo: 'Fertilizer — 20t', weightT: 20, date: 'Wed 15 May', price: { amount: 2100, currency: 'USD' }, poster: 'Coastline Carriers', status: 'open' },
    { id: 'xl-x3', from: 'Nairobi', to: 'Juba', cargo: 'Relief supplies — 10t', weightT: 10, date: 'Sat 18 May', price: { amount: 3400, currency: 'USD' }, poster: 'Horizon Logistics', status: 'open' },
  ],
  savannah: [
    { id: 'xl-x4', from: 'Accra', to: 'Kumasi', cargo: 'Assorted retail — 8t', weightT: 8, date: 'Fri 17 May', price: { amount: 4900, currency: 'GHS' }, poster: 'Melcom', status: 'open' },
    { id: 'xl-x5', from: 'Tema', to: 'Ouagadougou', cargo: 'FMCG — 14t', weightT: 14, date: 'Thu 16 May', price: { amount: 24000, currency: 'GHS' }, poster: 'Cocoa Processing Co.', status: 'open' },
  ],
};

/** qualitative annotations the engine can't know (exchange.md seed cards) */
export const LOAD_NOTES: Record<string, { text: string; warn?: boolean }[]> = {
  'xl-x1': [{ text: 'lane known · timing tight ◈' }],
  'xl-x2': [{ text: '20t is above your usual weight ◈', warn: true }],
  'xl-x3': [{ text: 'I know little about this lane — bid manually? ◈', warn: true }],
  'xl-x4': [{ text: 'your core lane ◈' }],
  'xl-x5': [{ text: 'thin lane memory ◈ — price manually', warn: true }],
};

// ---------- poster reputation (network-side facts) ----------

export interface PosterMeta {
  relation: string;
  rating: number;
  jobs: number;
  paysDays?: number;
  docsPct?: number;
}

export const POSTERS: Record<string, PosterMeta> = {
  'Uwezo Logistics': { relation: 'Exchange partner', rating: 4.8, jobs: 23, paysDays: 9, docsPct: 100 },
  'Nile Freight': { relation: 'Exchange partner', rating: 4.6, jobs: 31, paysDays: 12, docsPct: 97 },
  'Coast Carriers': { relation: 'New to you', rating: 4.2, jobs: 12, docsPct: 92 },
  'Rwanda Link Logistics': { relation: 'Your subcontractor', rating: 4.9, jobs: 23, paysDays: 9, docsPct: 100 },
  'Rift Valley Freighters': { relation: 'Exchange partner', rating: 4.5, jobs: 18, docsPct: 95 },
  'Coastline Carriers': { relation: 'New to you', rating: 4.1, jobs: 9, docsPct: 90 },
  'Horizon Logistics': { relation: 'New corridor', rating: 4.0, jobs: 5, docsPct: 88 },
  'Ashanti Timber Co.': { relation: 'Exchange partner', rating: 4.7, jobs: 14, paysDays: 11, docsPct: 96 },
  Melcom: { relation: 'Your customer', rating: 4.9, jobs: 34, paysDays: 14, docsPct: 100 },
  'Cocoa Processing Co.': { relation: 'Your customer', rating: 4.8, jobs: 21, paysDays: 21, docsPct: 98 },
};

export const posterMeta = (name: string): PosterMeta =>
  POSTERS[name] ?? { relation: 'Exchange partner', rating: 4.4, jobs: 10, docsPct: 94 };

// ---------- lane memory lookup (mirrors store laneKey) ----------

const laneKey = (from: string, to: string) => `${from}→${to}`.toLowerCase().replace(/\s+/g, '');

export const findLaneFact = (facts: MemoryFact[], from: string, to: string) =>
  facts.find(
    (f) => f.kind === 'lane' && f.status !== 'archived'
      && f.label.toLowerCase().replace(/\s+/g, '').includes(laneKey(from, to)),
  );

/**
 * Display fit = engine fitScore, bounded by how much memory we actually have.
 * A lane with <60% confidence caps the score at that confidence — the honesty
 * pattern from exchange.md §2 (Nairobi→Juba shows 41, not a hollow 85).
 */
export function computeDisplayFit(
  load: ExchangeLoad,
  fit: FitResult,
  facts: MemoryFact[],
): FitResult & { laneFact?: MemoryFact } {
  const laneFact = findLaneFact(facts, load.from, load.to);
  if (laneFact && laneFact.confidence < 60) {
    return {
      score: Math.min(fit.score, laneFact.confidence),
      reasons: [...fit.reasons, 'thin corridor memory ◈ — bid manually?'],
      laneFact,
    };
  }
  return { ...fit, laneFact };
}

export function useDisplayFit(load: ExchangeLoad): FitResult & { laneFact?: MemoryFact } {
  const fitScore = useStore((s) => s.fitScore);
  const facts = useStore((s) => s.memoryFacts);
  return computeDisplayFit(load, fitScore(load), facts);
}

// ---------- governed bidding config ----------

export interface BidFloor {
  min: number;
  label: string; // e.g. '$1,600' / 'GH₵3,500'
}

/** Bid floor for the header chip + modal's live check (design.md §12.7 / GHS floors for Savannah). */
export function useBidFloor(): BidFloor {
  const tenantId = useStore((s) => s.activeTenantId);
  const policies = useStore((s) => s.policies);
  const policy = policies.find((p) => p.tenantId === tenantId && p.kind === 'bid-floor' && p.enabled);
  if (policy) return { min: Number(policy.params.minUsd ?? 1600), label: `$${Number(policy.params.minUsd ?? 1600).toLocaleString()}` };
  if (tenantId === 'savannah') return { min: 3500, label: 'GH₵3,500' };
  return { min: 1600, label: '$1,600' };
}

export const moneyBand = (band: [number, number], money: Money) => {
  const sym = money.currency === 'GHS' ? 'GH₵' : money.currency === 'USD' ? '$' : `${money.currency} `;
  return `${sym}${band[0].toLocaleString()}–${band[1].toLocaleString()}`;
};

export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
