// Movements page helpers — corridor geography (on the 1200×900 map viewBoxes),
// currency derivation, and the Progressive Complexity tier rule (design.md §11).
import type { Currency, Movement } from '@/store';

/** City node coordinates on the tenant map assets (map-east-africa.svg / map-ghana.svg). */
export const CITY_COORDS: Record<string, [number, number]> = {
  Mombasa: [850, 540],
  Nairobi: [650, 430],
  Kampala: [500, 410],
  Kigali: [415, 520],
  Juba: [420, 150],
  'Dar es Salaam': [790, 700],
  Tema: [560, 700],
  'Tema Port': [560, 700],
  Accra: [505, 695],
  Kumasi: [430, 480],
  Takoradi: [335, 705],
  Ouagadougou: [490, 130],
};

/** Border-crossing diamond coordinates on the same viewBoxes. */
export const BORDER_COORDS: Record<string, [number, number]> = {
  Malaba: [575, 385],
  Busia: [578, 435],
  Gatuna: [445, 465],
  Nimule: [445, 250],
  Paga: [508, 236],
};

/** Jurisdiction flag → corridor currency (design.md §12.1). */
export const FLAG_CURRENCY: Record<string, Currency> = {
  KE: 'KES',
  UG: 'UGX',
  RW: 'RWF',
  GH: 'GHS',
};

/** Micro FX rates vs USD (demo quotes, mono display only). */
export const FX_RATES: Record<Currency, string> = {
  USD: '1.00',
  KES: '129.7',
  UGX: '3,780',
  RWF: '1,310',
  GHS: '14.6',
};

/** Route polyline for LiveMap: origin → each border (in route order) → destination. */
export function routePoints(m: Movement): [number, number][] {
  const pts: [number, number][] = [];
  const from = CITY_COORDS[m.from];
  if (from) pts.push(from);
  m.borders.forEach((b) => {
    const c = BORDER_COORDS[b.name];
    if (c) pts.push(c);
  });
  const to = CITY_COORDS[m.to];
  if (to) pts.push(to);
  // drop consecutive duplicates
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
}

/** Currencies touched by this movement — price currency first, then corridor flags. */
export function corridorCurrencies(m: Movement): Currency[] {
  const out: Currency[] = [m.price.currency];
  m.flags.forEach((f) => {
    const c = FLAG_CURRENCY[f];
    if (c && !out.includes(c)) out.push(c);
  });
  return out;
}

/** Total route distance from legs. */
export function totalKm(m: Movement): number {
  return m.legs.reduce((sum, l) => sum + (l.distanceKm ?? 0), 0);
}

/**
 * Progressive Complexity tiers (design.md §11).
 * Render rule: a tier renders only when data exists.
 */
export function movementTiers(m: Movement) {
  const hasPartnerLeg = m.legs.some((l) => l.partnerName);
  return {
    /** L1 — legs & handoffs */
    L1: m.legs.length > 1 || hasPartnerLeg,
    /** L2 — jurisdictions & borders */
    L2: m.borders.length > 0,
    /** L3 — money events (multi-currency, advances, settlements) */
    L3: m.moneyEvents.length > 0 || !!m.cost || !!m.margin,
    /** L4 — network & controls (partner SLAs, responsibility transfers) */
    L4: hasPartnerLeg || m.parties.some((p) => p.role === 'partner'),
  };
}

/** Docs verified fraction. */
export function docProgress(m: Movement): [number, number] {
  const done = m.docs.filter((d) => d.status === 'verified').length;
  return [done, m.docs.length];
}
