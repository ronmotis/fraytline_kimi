// Hand-tuned entity-graph layout per tenant (design.md §7 / memory.md §2).
// Positions live in a 760×480 SVG viewBox; node radius ∝ linked fact count.

export type GraphNodeType = 'lane' | 'customer' | 'fleet' | 'partner' | 'habit';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  x: number;
  y: number;
  r: number;
  /** low-confidence node — pulses warn, asks instead of assumes */
  warn?: boolean;
  /** curated facts surfaced in the node detail panel */
  factIds: string[];
  /** keyword applied to the fact stream when "Open in stream" is clicked */
  streamQuery?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** thickness ∝ interaction frequency */
  w: number;
  dashed?: boolean;
}

export interface TenantGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const meridian: TenantGraph = {
  nodes: [
    // lanes (ember)
    { id: 'nbo-kla', label: 'Nairobi–Kampala', type: 'lane', x: 250, y: 160, r: 26, factIds: ['f-lane-nbo-kla', 'f-border-pref', 'f-pricing-winrate'], streamQuery: 'kampala' },
    { id: 'mom-kig', label: 'Mombasa–Kigali', type: 'lane', x: 500, y: 300, r: 20, factIds: ['f-partner-rwlink', 'f-border-pref'], streamQuery: 'busia' },
    { id: 'nbo-juba', label: 'Nairobi–Juba', type: 'lane', x: 150, y: 340, r: 13, warn: true, factIds: ['f-lane-nbo-juba'], streamQuery: 'juba' },
    // customers (paper)
    { id: 'bidco', label: 'Bidco Africa', type: 'customer', x: 90, y: 90, r: 15, factIds: ['f-customer-bidco', 'f-lane-nbo-kla'], streamQuery: 'bidco' },
    { id: 'twiga', label: 'Twiga Foods', type: 'customer', x: 350, y: 60, r: 13, factIds: ['f-lane-nbo-kla', 'f-pricing-winrate'] },
    { id: 'kengen', label: 'KenGen', type: 'customer', x: 585, y: 105, r: 12, factIds: ['f-lane-kla-nbo'] },
    { id: 'dangote', label: 'Dangote KE', type: 'customer', x: 70, y: 250, r: 12, factIds: ['f-lane-nbo-juba'], streamQuery: 'juba' },
    // fleet (steel)
    { id: 'kdj', label: 'KDJ 482T', type: 'fleet', x: 430, y: 205, r: 14, factIds: ['f-border-pref', 'f-partner-rwlink'] },
    { id: 'kdl', label: 'KDL 117C', type: 'fleet', x: 615, y: 200, r: 10, factIds: [] },
    { id: 'kdm', label: 'KDM 930B', type: 'fleet', x: 662, y: 320, r: 10, factIds: [] },
    { id: 'kbz', label: 'KBZ 214F', type: 'fleet', x: 700, y: 125, r: 10, factIds: [] },
    // partners (teal)
    { id: 'rwlink', label: 'Rwanda Link', type: 'partner', x: 450, y: 425, r: 14, factIds: ['f-partner-rwlink'], streamQuery: 'rwanda' },
    { id: 'malaba-agent', label: 'Malaba Agent', type: 'partner', x: 305, y: 268, r: 10, factIds: ['f-border-pref'], streamQuery: 'busia' },
    // habits / rules (steel-blue dashed)
    { id: 'no-sunday', label: 'No Sunday departures', type: 'habit', x: 245, y: 432, r: 12, factIds: ['f-pattern-sunday'], streamQuery: 'sunday' },
    { id: 'margin-floor', label: 'Margin floor 12%', type: 'habit', x: 618, y: 432, r: 12, factIds: ['f-pricing-winrate'], streamQuery: 'win-rate' },
  ],
  edges: [
    { from: 'bidco', to: 'nbo-kla', w: 2.5 },
    { from: 'twiga', to: 'nbo-kla', w: 2 },
    { from: 'kengen', to: 'mom-kig', w: 1.5 },
    { from: 'dangote', to: 'nbo-juba', w: 1 },
    { from: 'rwlink', to: 'mom-kig', w: 2.5 },
    { from: 'kdj', to: 'mom-kig', w: 2 },
    { from: 'kdj', to: 'nbo-kla', w: 1.5 },
    { from: 'kdj', to: 'malaba-agent', w: 0.75 },
    { from: 'malaba-agent', to: 'mom-kig', w: 1.5 },
    { from: 'malaba-agent', to: 'nbo-kla', w: 1 },
    { from: 'kdl', to: 'nbo-kla', w: 1 },
    { from: 'kdm', to: 'nbo-kla', w: 0.75 },
    { from: 'kbz', to: 'mom-kig', w: 0.75 },
    { from: 'nbo-kla', to: 'mom-kig', w: 1.5 },
    { from: 'no-sunday', to: 'nbo-kla', w: 1, dashed: true },
    { from: 'margin-floor', to: 'nbo-kla', w: 1, dashed: true },
    { from: 'margin-floor', to: 'nbo-juba', w: 0.75, dashed: true },
  ],
};

const savannah: TenantGraph = {
  nodes: [
    // lanes (ember)
    { id: 'acc-kum', label: 'Accra–Kumasi', type: 'lane', x: 250, y: 155, r: 24, factIds: ['f-lane-acc-kum'], streamQuery: 'kumasi' },
    { id: 'tema-acc', label: 'Tema Port–Accra', type: 'lane', x: 490, y: 300, r: 16, factIds: ['f-pattern-tema'], streamQuery: 'tema' },
    { id: 'acc-oua', label: 'Accra–Ouagadougou', type: 'lane', x: 150, y: 335, r: 12, warn: true, factIds: [], streamQuery: 'ouagadougou' },
    // customers (paper)
    { id: 'melcom', label: 'Melcom', type: 'customer', x: 90, y: 90, r: 14, factIds: ['f-customer-melcom'], streamQuery: 'melcom' },
    { id: 'cocoa', label: 'Cocoa Processing', type: 'customer', x: 430, y: 70, r: 13, factIds: [], streamQuery: 'cocoa' },
    // fleet (steel)
    { id: 'gh4521', label: 'GH 4521-24', type: 'fleet', x: 400, y: 205, r: 13, factIds: ['f-pattern-tema'] },
    { id: 'gw8832', label: 'GW 8832-23', type: 'fleet', x: 610, y: 185, r: 10, factIds: [] },
    { id: 'ge2210', label: 'GE 2210-22', type: 'fleet', x: 650, y: 320, r: 10, factIds: [] },
    // habits (steel-blue dashed)
    { id: 'fri-gate', label: 'Friday Tema queues +3h', type: 'habit', x: 310, y: 425, r: 12, factIds: ['f-pattern-tema'], streamQuery: 'tema' },
  ],
  edges: [
    { from: 'melcom', to: 'acc-kum', w: 2 },
    { from: 'melcom', to: 'acc-oua', w: 1 },
    { from: 'cocoa', to: 'tema-acc', w: 2 },
    { from: 'cocoa', to: 'acc-kum', w: 1 },
    { from: 'gh4521', to: 'tema-acc', w: 2 },
    { from: 'gh4521', to: 'acc-kum', w: 1.5 },
    { from: 'gw8832', to: 'tema-acc', w: 1 },
    { from: 'ge2210', to: 'acc-kum', w: 0.75 },
    { from: 'acc-kum', to: 'acc-oua', w: 1 },
    { from: 'fri-gate', to: 'tema-acc', w: 1, dashed: true },
  ],
};

export const GRAPHS: Record<string, TenantGraph> = { meridian, savannah };

export const NODE_STYLE: Record<GraphNodeType, { fill: string; stroke: string; dashed?: boolean }> = {
  lane: { fill: 'rgba(232,145,45,0.14)', stroke: 'var(--ember)' },
  customer: { fill: 'var(--surface-3)', stroke: 'var(--text-1)' },
  fleet: { fill: 'var(--surface-2)', stroke: 'var(--text-3)' },
  partner: { fill: 'rgba(47,211,190,0.12)', stroke: 'var(--teal)' },
  habit: { fill: 'var(--surface-1)', stroke: 'var(--quote)', dashed: true },
};

export const NODE_LEGEND: { type: GraphNodeType; label: string }[] = [
  { type: 'lane', label: 'Lanes' },
  { type: 'customer', label: 'Customers' },
  { type: 'fleet', label: 'Fleet' },
  { type: 'partner', label: 'Partners' },
  { type: 'habit', label: 'Habits & rules' },
];
