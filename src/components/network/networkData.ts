// Network page-local data (network.md). Org structure depth lives here; the
// store holds tenants/people/fleet — this is the revealed org model per tenant.

export interface Branch {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  currency: string;
  compliance: string[];
  staff: number;
  movementsWeek: number;
  note?: string;
  isHQ?: boolean;
  added?: boolean; // created via the extensibility flow this session
}

export const BRANCHES: Record<string, Branch[]> = {
  meridian: [
    { id: 'br-hq', name: 'Nairobi HQ', country: 'Kenya', countryCode: 'KE', currency: 'KES', compliance: ['EAC transit', 'COMESA'], staff: 22, movementsWeek: 24, note: 'HQ · control plane', isHQ: true },
    { id: 'br-mba', name: 'Mombasa', country: 'Kenya', countryCode: 'KE', currency: 'KES', compliance: ['EAC transit', 'Port ops'], staff: 6, movementsWeek: 9, note: 'port ops' },
    { id: 'br-kla', name: 'Kampala', country: 'Uganda', countryCode: 'UG', currency: 'UGX', compliance: ['EAC transit', 'COMESA'], staff: 8, movementsWeek: 11, note: 'depot + handoff point' },
    { id: 'br-kgl', name: 'Kigali', country: 'Rwanda', countryCode: 'RW', currency: 'RWF', compliance: ['EAC transit'], staff: 5, movementsWeek: 7, note: 'partner co-located · Rwanda Link' },
  ],
  savannah: [
    { id: 'br-acc', name: 'Accra', country: 'Ghana', countryCode: 'GH', currency: 'GHS', compliance: ['ECOWAS'], staff: 5, movementsWeek: 6, note: 'HQ · single branch', isHQ: true },
  ],
};

/** country → auto-detected currency + compliance suggestions (add-branch flow) */
export const COUNTRY_OPTIONS: { name: string; code: string; currency: string; compliance: string }[] = [
  { name: 'Tanzania', code: 'TZ', currency: 'TZS', compliance: 'EAC transit bond required for TZ corridors ◈' },
  { name: 'South Sudan', code: 'SS', currency: 'SSP', compliance: 'Emerging corridor — low memory, manual review ◈' },
  { name: 'Ethiopia', code: 'ET', currency: 'ETB', compliance: 'COMESA pack suggested ◈' },
  { name: 'Burundi', code: 'BI', currency: 'BIF', compliance: 'EAC transit bond required ◈' },
  { name: 'DRC', code: 'CD', currency: 'CDF', compliance: 'Dual sign-off recommended ◈' },
];

export const SAVANNAH_COUNTRY_OPTIONS: { name: string; code: string; currency: string; compliance: string }[] = [
  { name: 'Togo', code: 'TG', currency: 'XOF', compliance: 'ECOWAS pack auto-applies ◈' },
  { name: 'Côte d’Ivoire', code: 'CI', currency: 'XOF', compliance: 'ECOWAS pack auto-applies ◈' },
  { name: 'Burkina Faso', code: 'BF', currency: 'XOF', compliance: 'Cross-border docs pack suggested ◈' },
];

// people table extras (branch, last active) keyed by person id
export const PERSON_META: Record<string, { branch: string; lastActive: string }> = {
  'p-wanjiru': { branch: 'Nairobi HQ', lastActive: 'now' },
  'p-david': { branch: 'Nairobi HQ', lastActive: '12m ago' },
  'p-amina': { branch: 'Nairobi HQ', lastActive: '1h ago' },
  'p-joseph': { branch: 'en route · KDJ 482T', lastActive: '6m ago' },
  'p-grace': { branch: 'Kigali · partner', lastActive: '2h ago' },
  'p-kwabena': { branch: 'Accra', lastActive: 'now' },
  'p-efua': { branch: 'Accra', lastActive: '24m ago' },
  'p-yaw': { branch: 'en route · GH 4521-24', lastActive: '9m ago' },
};

// fleet extras (utilization, odometer) keyed by unit id
export const UNIT_META: Record<string, { util: number; km: string }> = {
  'v-kdj482t': { util: 78, km: '184k km' },
  'v-kdl117c': { util: 62, km: '121k km' },
  'v-kdm930b': { util: 41, km: '167k km' },
  'v-kbz214f': { util: 55, km: '203k km' },
  'v-gh4521': { util: 71, km: '96k km' },
  'v-gw8832': { util: 58, km: '88k km' },
  'v-ge2210': { util: 66, km: '74k km' },
  'v-gr5566': { util: 44, km: '112k km' },
};
