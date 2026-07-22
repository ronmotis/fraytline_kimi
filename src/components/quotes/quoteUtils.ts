// Quotes page utilities — NL brief parsing, win-probability bands, board mapping.
import type { Customer, Quote } from '@/store';

export type ColKey = 'draft' | 'sent' | 'negotiating' | 'won' | 'lost';

export const COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

/** Map a store quote status onto a pipeline column (store has no 'negotiating' — local UI state covers it). */
export function statusToCol(status: Quote['status']): ColKey {
  if (status === 'draft') return 'draft';
  if (status === 'sent' || status === 'opened') return 'sent';
  if (status === 'won') return 'won';
  return 'lost';
}

export interface QuoteOverride {
  col: ColKey;
  counter?: number;
  reason?: string;
}

// ---------- NL brief parsing ----------

export interface BriefParse {
  from: string;
  to: string;
  weightT: number;
  cargo: string;
  customer?: string; // matched canonical customer name
  customerRaw?: string; // as typed
  day?: string; // weekday label e.g. 'Tuesday'
}

const titleCase = (s: string) =>
  s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/** Cities the demo universe knows — used to keep cargo words out of the lane. */
const KNOWN_CITIES = [
  'nairobi', 'mombasa', 'kampala', 'kigali', 'juba', 'dar es salaam',
  'accra', 'kumasi', 'tema port', 'tema', 'takoradi', 'ouagadougou',
];

/** Demo week dates (dispatch.md: Mon 19 — Sun 25 May). */
export const DAY_DATES: Record<string, string> = {
  monday: 'Mon 19 May',
  tuesday: 'Tue 20 May',
  wednesday: 'Wed 21 May',
  thursday: 'Thu 22 May',
  friday: 'Fri 23 May',
  saturday: 'Sat 24 May',
  sunday: 'Sun 25 May',
  today: 'Wed 21 May',
  tomorrow: 'Thu 22 May',
};

/**
 * Parse a natural-language quote brief:
 *   "12t general cargo, Nairobi → Kampala, pickup Tuesday, for Bidco"
 *   "quote 12t nairobi to kampala tuesday for bidco"
 */
export function parseBrief(text: string, customers: Customer[]): BriefParse | null {
  let body = text.trim().toLowerCase();
  if (!body) return null;
  body = body.replace(/^(new quote|quote|draft a quote|create quote)[,:]?\s*/, '');
  body = body.replace(/→/g, ' to ').replace(/->/g, ' to ').replace(/,/g, ' ');

  // weight
  const weightMatch = body.match(/(\d+)\s*t\b/);
  const weightT = weightMatch ? Number(weightMatch[1]) : 12;

  // pickup day
  const dayMatch = body.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/);
  const day = dayMatch ? titleCase(dayMatch[1]) : undefined;

  // customer — "for X" at end
  const forMatch = body.match(/\bfor\s+([a-z][a-z ]*)$/);
  const customerRaw = forMatch ? titleCase(forMatch[1].trim()) : undefined;
  const customer = customerRaw
    ? customers.find((c) => {
        const needle = customerRaw.toLowerCase();
        const hay = c.name.toLowerCase();
        return hay.includes(needle) || needle.includes(hay.split(' ')[0]);
      })?.name ?? customerRaw
    : undefined;

  // strip weight / day / customer phrases, then route "X to Y"
  const routeBody = body
    .replace(/(\d+)\s*t\b/, ' ')
    .replace(/\b(general cargo|general|cargo|ftl|ltl)\b/g, ' ')
    .replace(/\b(pickup|pick up|on|next|this)\b/g, ' ')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/g, ' ')
    .replace(/\bfor\s+[a-z][a-z ]*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const routeMatch = routeBody.match(/([a-z][a-z ]*?)\s+to\s+([a-z][a-z ]*)$/);
  let from = routeMatch ? titleCase(routeMatch[1].trim()) : '';
  let to = routeMatch ? titleCase(routeMatch[2].trim()) : '';

  // known-city pass: cargo words ("20t switchgear mombasa to nairobi") must not pollute the lane
  if (routeMatch) {
    const fromCity = [...KNOWN_CITIES].filter((c) => routeMatch[1].trim().endsWith(c)).sort((a, b) => b.length - a.length)[0];
    const toCity = [...KNOWN_CITIES].filter((c) => routeMatch[2].trim().startsWith(c)).sort((a, b) => b.length - a.length)[0];
    if (fromCity) from = titleCase(fromCity);
    if (toCity) to = titleCase(toCity);
  }

  const cargo = weightMatch ? `${weightT}t · general · FTL` : 'General cargo';
  if (!from && !to && !customerRaw && !weightMatch) return null;
  return { from, to, weightT, cargo, customer, customerRaw, day };
}

// ---------- win-probability bands (◈ f-pricing-winrate: ≤+5% → 71% · ≥+15% → 22%) ----------

export function winProbability(price: number, avg: number, memoryConfidence: number): number {
  if (memoryConfidence < 60) return 40;
  const pct = ((price - avg) / avg) * 100;
  if (pct <= 5) return 71;
  if (pct >= 15) return 22;
  return Math.round(71 - ((pct - 5) / 10) * (71 - 22));
}

export function pctAboveAvg(price: number, avg: number): number {
  return Math.round(((price - avg) / avg) * 1000) / 10;
}

/** Default Conductor price: memory avg + ~4% (inside the 71% win band), rounded to 10. */
export function defaultPrice(avg: number): number {
  return Math.round((avg * 1.04) / 10) * 10;
}

export const quoteStatusChip: Record<ColKey, string> = {
  draft: 'text-text-3 border-text-3/50 border-dashed',
  sent: 'text-quote border-quote/50',
  negotiating: 'text-warn border-warn/40 bg-warn/10',
  won: 'text-ok border-ok/30 bg-ok/10',
  lost: 'text-danger border-danger/40 bg-danger/10',
};

export const LOST_REASONS = ['price', 'timing', 'capacity', 'other'] as const;
export type LostReason = (typeof LOST_REASONS)[number];
