// Canonical demo universe (design.md §12). All pages reference this data.
import type { Tenant, Person, Customer, Movement, Quote, FleetUnit, Driver, MemoryFact, Policy, ApprovalAction, LedgerEntry, ExchangeLoad, ExchangeCapacity, DockMessage, AutonomyLevel, Inquiry } from './types';

export const DEMO_NOW = 'Tuesday, 14 May · 08:12 EAT';

export const tenants: Tenant[] = [
  {
    id: 'meridian',
    name: 'Meridian Freight',
    logo: '/logo-meridian.svg',
    hq: 'Nairobi, Kenya',
    branch: 'Nairobi HQ',
    descriptor: 'multinational · 14 trucks · 4 branches',
    scale: 'multinational',
    currencies: ['KES', 'UGX', 'RWF', 'USD'],
    mapAsset: '/map-east-africa.svg',
    trucks: 14,
  },
  {
    id: 'savannah',
    name: 'Savannah Haulage',
    logo: '/logo-savannah.svg',
    hq: 'Accra, Ghana',
    branch: 'Accra',
    descriptor: '4 trucks · local',
    scale: 'local',
    currencies: ['GHS', 'USD'],
    mapAsset: '/map-ghana.svg',
    trucks: 4,
  },
];

export const people: Person[] = [
  { id: 'p-wanjiru', tenantId: 'meridian', name: 'Wanjiru Kamau', role: 'Owner', title: 'Owner / Operator', avatar: '/avatar-wanjiru.png' },
  { id: 'p-david', tenantId: 'meridian', name: 'David Otieno', role: 'Dispatcher', title: 'Dispatcher', avatar: '/avatar-david.png' },
  { id: 'p-amina', tenantId: 'meridian', name: 'Amina Njoroge', role: 'Finance', title: 'Finance Lead', avatar: '/avatar-amina.png' },
  { id: 'p-joseph', tenantId: 'meridian', name: 'Joseph Kiprop', role: 'Driver', title: 'Driver · KDJ 482T', avatar: '/avatar-joseph.png' },
  { id: 'p-grace', tenantId: 'meridian', name: 'Grace Uwase', role: 'Partner', title: 'Rwanda Link Logistics · Kigali', avatar: '/avatar-grace.png' },
  { id: 'p-kwabena', tenantId: 'savannah', name: 'Kwabena Osei', role: 'Owner', title: 'Owner / Operator', avatar: '/avatar-kwabena.png' },
  { id: 'p-efua', tenantId: 'savannah', name: 'Efua Mensah', role: 'Dispatcher', title: 'Dispatcher' },
  { id: 'p-yaw', tenantId: 'savannah', name: 'Yaw Darko', role: 'Driver', title: 'Driver · GH 4521-24' },
];

export const customers: Customer[] = [
  { id: 'c-bidco', tenantId: 'meridian', name: 'Bidco Africa', industry: 'FMCG', paymentDays: 30 },
  { id: 'c-twiga', tenantId: 'meridian', name: 'Twiga Foods', industry: 'Fresh produce', paymentDays: 21 },
  { id: 'c-kengen', tenantId: 'meridian', name: 'KenGen', industry: 'Energy', paymentDays: 45 },
  { id: 'c-dangote', tenantId: 'meridian', name: 'Dangote Cement KE', industry: 'Construction', paymentDays: 30 },
  { id: 'c-melcom', tenantId: 'savannah', name: 'Melcom', industry: 'Retail', paymentDays: 14 },
  { id: 'c-cocoa', tenantId: 'savannah', name: 'Cocoa Processing Co.', industry: 'Agro-processing', paymentDays: 21 },
];

export const fleet: FleetUnit[] = [
  { id: 'v-kdj482t', tenantId: 'meridian', plate: 'KDJ 482T', model: 'Volvo FH', status: 'en-route', location: 'Malaba border', driverId: 'd-joseph', coords: [575, 385], heading: 205 },
  { id: 'v-kdl117c', tenantId: 'meridian', plate: 'KDL 117C', model: 'Scania R450', status: 'available', location: 'Nairobi yard', availableAt: 'Thu', driverId: 'd-mwangi', coords: [662, 442], heading: 90 },
  { id: 'v-kdm930b', tenantId: 'meridian', plate: 'KDM 930B', model: 'Volvo FM', status: 'service-due', location: 'Nairobi depot', serviceDueDays: 5, coords: [640, 448], heading: 90 },
  { id: 'v-kbz214f', tenantId: 'meridian', plate: 'KBZ 214F', model: 'Mercedes Actros', status: 'yard', location: 'Mombasa yard', driverId: 'd-barasa', coords: [850, 540], heading: 270 },
  { id: 'v-gh4521', tenantId: 'savannah', plate: 'GH 4521-24', model: 'Volvo FL', status: 'en-route', location: 'Nkawkaw bypass', driverId: 'd-yaw', coords: [492, 585], heading: 320 },
  { id: 'v-gw8832', tenantId: 'savannah', plate: 'GW 8832-23', model: 'MAN TGM', status: 'yard', location: 'Tema yard', coords: [560, 700], heading: 0 },
  { id: 'v-ge2210', tenantId: 'savannah', plate: 'GE 2210-22', model: 'DAF LF', status: 'available', location: 'Accra depot', driverId: 'd-kofi', coords: [505, 688], heading: 0 },
  { id: 'v-gr5566', tenantId: 'savannah', plate: 'GR 5566-24', model: 'Isuzu FVR', status: 'service-due', location: 'Accra workshop', serviceDueDays: 2, coords: [520, 700], heading: 0 },
];

export const drivers: Driver[] = [
  { id: 'd-joseph', tenantId: 'meridian', name: 'Joseph Kiprop', avatar: '/avatar-joseph.png', status: 'driving', hoursLeft: 6.5, vehicleId: 'v-kdj482t' },
  { id: 'd-mwangi', tenantId: 'meridian', name: 'Peter Mwangi', status: 'available', hoursLeft: 9, vehicleId: 'v-kdl117c' },
  { id: 'd-barasa', tenantId: 'meridian', name: 'Samuel Barasa', status: 'resting', hoursLeft: 4, vehicleId: 'v-kbz214f' },
  { id: 'd-yaw', tenantId: 'savannah', name: 'Yaw Darko', status: 'driving', hoursLeft: 5, vehicleId: 'v-gh4521' },
  { id: 'd-kofi', tenantId: 'savannah', name: 'Kofi Boateng', status: 'available', hoursLeft: 8, vehicleId: 'v-ge2210' },
];

export const movements: Movement[] = [
  {
    id: 'MR-2481',
    tenantId: 'meridian',
    from: 'Mombasa',
    to: 'Kigali',
    status: 'At Border',
    cargo: 'Edible oils — 22t',
    weightT: 22,
    customer: 'Bidco Africa',
    legs: [
      { id: 'mr2481-l1', seq: 1, from: 'Mombasa', to: 'Nairobi', mode: 'road-ftl', status: 'done', vehiclePlate: 'KDJ 482T', driverName: 'Joseph Kiprop', distanceKm: 485 },
      { id: 'mr2481-l2', seq: 2, from: 'Nairobi', to: 'Kampala', mode: 'road-ftl', status: 'active', vehiclePlate: 'KDJ 482T', driverName: 'Joseph Kiprop', distanceKm: 660 },
      { id: 'mr2481-l3', seq: 3, from: 'Kampala', to: 'Kigali', mode: 'road-ftl', status: 'planned', partnerName: 'Rwanda Link Logistics', distanceKm: 510 },
    ],
    borders: [
      { id: 'b-malaba', name: 'Malaba', fromCountry: 'KE', toCountry: 'UG', status: 'waiting', waitHours: 5.5, avgHours: 6.8, trend: 'down' },
      { id: 'b-gatuna', name: 'Gatuna', fromCountry: 'UG', toCountry: 'RW', status: 'upcoming', avgHours: 2.1 },
    ],
    docs: [
      { id: 'doc-bond', name: 'EAC Transit Bond', status: 'expiring', expiresInHours: 36, fields: [{ label: 'Bond no.', value: 'EAC-TB-88213' }, { label: 'Value', value: '$4,200' }, { label: 'Surety', value: 'Jubilee Insurance' }] },
      { id: 'doc-ci', name: 'Commercial Invoice', status: 'verified', fields: [{ label: 'Invoice no.', value: 'BID-2024-1190' }, { label: 'Incoterms', value: 'DAP Kigali' }] },
      { id: 'doc-pl', name: 'Packing List', status: 'verified' },
      { id: 'doc-comesa', name: 'COMESA Yellow Card', status: 'verified' },
      { id: 'doc-rwf', name: 'Rwanda Import Declaration', status: 'pending' },
      { id: 'doc-phyto', name: 'Phytosanitary Certificate', status: 'verified' },
    ],
    price: { amount: 4200, currency: 'USD' },
    cost: { amount: 3060, currency: 'USD' },
    margin: { amount: 1140, currency: 'USD' },
    moneyEvents: [
      { id: 'me-fuel', label: 'Fuel advance', value: { amount: 60000, currency: 'KES' }, status: 'done', kind: 'advance' },
      { id: 'me-border', label: 'Border advance', value: { amount: 180, currency: 'USD' }, status: 'pending', kind: 'advance' },
      { id: 'me-partner', label: 'Partner handoff accrual · Rwanda Link', value: { amount: 620, currency: 'USD' }, status: 'pending', kind: 'settlement' },
      { id: 'me-fx', label: 'FX exposure KES→USD', value: { amount: 462, currency: 'USD' }, status: 'pending', kind: 'fx' },
    ],
    milestones: [
      { id: 'm1', label: 'Departed Mombasa', time: 'Mon 06:40', status: 'done' },
      { id: 'm2', label: 'Nairobi cross-dock', time: 'Mon 18:15', status: 'done' },
      { id: 'm3', label: 'Arrived Malaba', time: '04:12', status: 'done' },
      { id: 'm4', label: 'Clear Malaba', time: 'ETA +5.5h', status: 'current' },
      { id: 'm5', label: 'Kampala handoff · Rwanda Link', time: 'Tue 22:00', status: 'upcoming' },
      { id: 'm6', label: 'Gatuna crossing', time: 'Wed 04:00', status: 'upcoming' },
      { id: 'm7', label: 'Deliver Kigali', time: 'Wed 11:00', status: 'upcoming' },
    ],
    parties: [
      { name: 'Bidco Africa', role: 'shipper', detail: 'Nairobi' },
      { name: 'Bidco Kigali', role: 'consignee', detail: 'Kigali' },
      { name: 'Rwanda Link Logistics', role: 'partner', detail: 'Grace Uwase · on-time 96%' },
      { name: 'Joseph Kiprop', role: 'driver', detail: 'KDJ 482T · 6.5h left' },
    ],
    progress: 0.6,
    nextMilestone: 'Clear Malaba',
    nextMilestoneInH: 5.5,
    vehiclePlate: 'KDJ 482T',
    driverName: 'Joseph Kiprop',
    exceptionNote: 'EAC transit bond expires in 36h',
    flags: ['KE', 'UG', 'RW'],
  },
  {
    id: 'MR-2479',
    tenantId: 'meridian',
    from: 'Nairobi',
    to: 'Kampala',
    status: 'Delivered',
    cargo: 'Fresh produce — 14t',
    weightT: 14,
    customer: 'Twiga Foods',
    legs: [
      { id: 'mr2479-l1', seq: 1, from: 'Nairobi', to: 'Kampala', mode: 'road-ftl', status: 'done', vehiclePlate: 'KDM 930B', driverName: 'Peter Mwangi', distanceKm: 660 },
    ],
    borders: [
      { id: 'b-busia-2479', name: 'Busia', fromCountry: 'KE', toCountry: 'UG', status: 'cleared', waitHours: 3.1, avgHours: 3.2 },
    ],
    docs: [
      { id: 'doc-pod-2479', name: 'Proof of Delivery', status: 'verified', fields: [{ label: 'Signed by', value: 'R. Nakato · Twiga Kampala' }, { label: 'Received', value: 'Mon 15:42' }] },
      { id: 'doc-ci-2479', name: 'Commercial Invoice', status: 'verified' },
    ],
    price: { amount: 1850, currency: 'USD' },
    cost: { amount: 1330, currency: 'USD' },
    margin: { amount: 520, currency: 'USD' },
    moneyEvents: [
      { id: 'me-inv-2479', label: 'Invoice INV-2479', value: { amount: 1850, currency: 'USD' }, status: 'pending', kind: 'invoice' },
      { id: 'me-set-2479', label: 'Settlement · Twiga (21d terms)', value: { amount: 1850, currency: 'USD' }, status: 'pending', kind: 'settlement' },
    ],
    milestones: [
      { id: 'm1', label: 'Departed Nairobi', time: 'Sun 05:30', status: 'done' },
      { id: 'm2', label: 'Busia cleared · 3.1h', time: 'Sun 14:20', status: 'done' },
      { id: 'm3', label: 'Delivered Kampala · POD signed', time: 'Mon 15:42', status: 'done' },
      { id: 'm4', label: 'Settlement due', time: '12 Jun', status: 'upcoming' },
    ],
    parties: [
      { name: 'Twiga Foods', role: 'shipper', detail: 'Nairobi' },
      { name: 'Twiga Kampala', role: 'consignee' },
    ],
    progress: 1,
    nextMilestone: 'Settlement due 12 Jun',
    flags: ['KE', 'UG'],
    vehiclePlate: 'KDM 930B',
    driverName: 'Peter Mwangi',
  },
  {
    id: 'MR-2483',
    tenantId: 'meridian',
    from: 'Kampala',
    to: 'Nairobi',
    status: 'Booked',
    cargo: 'Transformer units — 18t',
    weightT: 18,
    customer: 'KenGen',
    legs: [
      { id: 'mr2483-l1', seq: 1, from: 'Kampala', to: 'Nairobi', mode: 'road-ftl', status: 'planned', distanceKm: 660 },
    ],
    borders: [
      { id: 'b-busia-2483', name: 'Busia', fromCountry: 'UG', toCountry: 'KE', status: 'upcoming', avgHours: 3.2 },
    ],
    docs: [
      { id: 'doc-ci-2483', name: 'Commercial Invoice', status: 'pending' },
      { id: 'doc-permit-2483', name: 'Abnormal Load Permit', status: 'pending' },
    ],
    price: { amount: 1720, currency: 'USD' },
    cost: { amount: 1290, currency: 'USD' },
    margin: { amount: 430, currency: 'USD' },
    moneyEvents: [],
    milestones: [
      { id: 'm1', label: 'Pickup Kampala', time: 'Wed 10:00', status: 'upcoming' },
      { id: 'm2', label: 'Busia crossing', time: 'Wed 16:00', status: 'upcoming' },
      { id: 'm3', label: 'Deliver Nairobi', time: 'Thu 08:00', status: 'upcoming' },
    ],
    parties: [
      { name: 'KenGen', role: 'shipper', detail: 'Kampala depot' },
      { name: 'KenGen Nairobi', role: 'consignee' },
    ],
    progress: 0,
    nextMilestone: 'Pickup Kampala',
    nextMilestoneInH: 26,
    pickupIn: '26h',
    exceptionNote: 'Unassigned — pickup in 26h',
    flags: ['UG', 'KE'],
  },
  {
    id: 'MR-2485',
    tenantId: 'meridian',
    from: 'Nairobi',
    to: 'Juba',
    status: 'Draft',
    cargo: 'Cement — 24t',
    weightT: 24,
    customer: 'Dangote Cement KE',
    legs: [
      { id: 'mr2485-l1', seq: 1, from: 'Nairobi', to: 'Juba', mode: 'road-ftl', status: 'planned', distanceKm: 1130 },
    ],
    borders: [
      { id: 'b-nimule-2485', name: 'Nimule', fromCountry: 'UG', toCountry: 'SS', status: 'upcoming' },
    ],
    docs: [
      { id: 'doc-ci-2485', name: 'Commercial Invoice', status: 'missing' },
      { id: 'doc-ss-permit', name: 'South Sudan Entry Permit', status: 'missing' },
    ],
    price: { amount: 3400, currency: 'USD' },
    moneyEvents: [],
    milestones: [
      { id: 'm1', label: 'Pickup Nairobi', time: 'TBD', status: 'upcoming' },
      { id: 'm2', label: 'Nimule crossing', time: 'TBD', status: 'upcoming' },
      { id: 'm3', label: 'Deliver Juba', time: 'TBD', status: 'upcoming' },
    ],
    parties: [{ name: 'Dangote Cement KE', role: 'shipper' }],
    progress: 0,
    exceptionNote: 'Emerging corridor — memory confidence low (41%)',
    flags: ['KE', 'UG', 'SS'],
  },
  {
    id: 'SV-104',
    tenantId: 'savannah',
    from: 'Tema Port',
    to: 'Kumasi',
    status: 'In Transit',
    cargo: 'Cocoa butter — 12t',
    weightT: 12,
    customer: 'Cocoa Processing Co.',
    legs: [
      { id: 'sv104-l1', seq: 1, from: 'Tema Port', to: 'Kumasi', mode: 'road-ftl', status: 'active', vehiclePlate: 'GH 4521-24', driverName: 'Yaw Darko', distanceKm: 270 },
    ],
    borders: [],
    docs: [
      { id: 'doc-waybill-sv104', name: 'Waybill', status: 'verified' },
      { id: 'doc-port-sv104', name: 'Port Release Note', status: 'verified' },
    ],
    price: { amount: 8400, currency: 'GHS' },
    cost: { amount: 6300, currency: 'GHS' },
    margin: { amount: 2100, currency: 'GHS' },
    moneyEvents: [
      { id: 'me-fuel-sv104', label: 'Fuel advance', value: { amount: 1800, currency: 'GHS' }, status: 'done', kind: 'advance' },
    ],
    milestones: [
      { id: 'm1', label: 'Loaded Tema Port', time: '05:50', status: 'done' },
      { id: 'm2', label: 'Nkawkaw bypass', time: 'now', status: 'current' },
      { id: 'm3', label: 'Deliver Kumasi', time: '13:30', status: 'upcoming' },
    ],
    parties: [
      { name: 'Cocoa Processing Co.', role: 'consignee', detail: 'Kumasi' },
      { name: 'Yaw Darko', role: 'driver', detail: 'GH 4521-24 · 5h left' },
    ],
    progress: 0.45,
    nextMilestone: 'Deliver Kumasi',
    nextMilestoneInH: 5.3,
    vehiclePlate: 'GH 4521-24',
    driverName: 'Yaw Darko',
    flags: ['GH'],
  },
  {
    id: 'SV-106',
    tenantId: 'savannah',
    from: 'Accra',
    to: 'Ouagadougou',
    status: 'Quoted',
    cargo: 'FMCG — 14t',
    weightT: 14,
    customer: 'Melcom',
    legs: [
      { id: 'sv106-l1', seq: 1, from: 'Accra', to: 'Kumasi', mode: 'road-ftl', status: 'planned', distanceKm: 250 },
      { id: 'sv106-l2', seq: 2, from: 'Kumasi', to: 'Ouagadougou', mode: 'road-ftl', status: 'planned', distanceKm: 760 },
    ],
    borders: [
      { id: 'b-paga-sv106', name: 'Paga', fromCountry: 'GH', toCountry: 'BF', status: 'upcoming', avgHours: 4.5 },
    ],
    docs: [
      { id: 'doc-ecowas-sv106', name: 'ECOWAS Brown Card', status: 'pending' },
      { id: 'doc-ci-sv106', name: 'Commercial Invoice', status: 'verified' },
      { id: 'doc-transit-sv106', name: 'Burkina Transit Declaration', status: 'missing' },
      { id: 'doc-phyto-sv106', name: 'Sanitary Certificate', status: 'verified' },
    ],
    price: { amount: 26500, currency: 'GHS' },
    moneyEvents: [],
    milestones: [
      { id: 'm1', label: 'Pickup Accra', time: 'Fri 06:00', status: 'upcoming' },
      { id: 'm2', label: 'Paga crossing', time: 'Sat 09:00', status: 'upcoming' },
      { id: 'm3', label: 'Deliver Ouagadougou', time: 'Sat 18:00', status: 'upcoming' },
    ],
    parties: [{ name: 'Melcom', role: 'shipper', detail: 'Accra' }],
    progress: 0,
    flags: ['GH', 'BF'],
    quoteId: 'Q-SV-02',
  },
];

export const inquiries: Inquiry[] = [
  {
    id: 'inq-1', tenantId: 'meridian', customer: 'East African Breweries', from: 'Nairobi', to: 'Mombasa',
    cargo: 'Beer kegs — 16t', weightT: 16, channel: 'email', receivedAt: '08:12',
    note: 'Weekly lane — needs a Friday pickup slot', status: 'new',
  },
  {
    id: 'inq-2', tenantId: 'meridian', customer: 'Unga Group', from: 'Nakuru', to: 'Nairobi',
    cargo: 'Wheat flour — 20t', weightT: 20, channel: 'whatsapp', receivedAt: '07:48',
    note: 'Repeat customer — price-sensitive, decide today', status: 'new',
  },
  {
    id: 'inq-3', tenantId: 'meridian', customer: 'Davis & Shirtliff', from: 'Nairobi', to: 'Kisumu',
    cargo: 'Pump units — 8t', weightT: 8, channel: 'phone', receivedAt: 'Yesterday',
    note: 'Called twice — wants a firm number', status: 'triaged',
  },
  {
    id: 'inq-sv1', tenantId: 'savannah', customer: 'Melcom', from: 'Accra', to: 'Tamale',
    cargo: 'FMCG pallets — 12t', weightT: 12, channel: 'portal', receivedAt: '06:55',
    status: 'new',
  },
];

export const quotes: Quote[] = [
  {
    id: 'Q-311', tenantId: 'meridian', customer: 'Bidco Africa', from: 'Nairobi', to: 'Kampala',
    cargo: 'Edible oils — 12t', weightT: 12,
    price: { amount: 1920, currency: 'USD' }, cost: { amount: 1610, currency: 'USD' }, marginPct: 19,
    status: 'opened', openCount: 3, sentAt: 'Sun 09:14', lastActivity: 'Opened 3× · no reply 2 days',
    confidence: 94, memoryFactId: 'f-lane-nbo-kla', winProbability: 71, pickupDate: 'Tue', createdBy: 'conductor',
  },
  {
    id: 'Q-312', tenantId: 'meridian', customer: 'KenGen', from: 'Mombasa', to: 'Nairobi',
    cargo: 'Switchgear — 20t', weightT: 20,
    price: { amount: 1450, currency: 'USD' }, cost: { amount: 1210, currency: 'USD' }, marginPct: 20,
    status: 'sent', openCount: 1, sentAt: 'Mon 14:02', lastActivity: 'Sent Mon · opened once',
    confidence: 88, winProbability: 64, pickupDate: 'Thu', createdBy: 'conductor',
  },
  {
    id: 'Q-309', tenantId: 'meridian', customer: 'Twiga Foods', from: 'Nairobi', to: 'Kampala',
    cargo: 'Fresh produce — 14t', weightT: 14,
    price: { amount: 1850, currency: 'USD' }, cost: { amount: 1330, currency: 'USD' }, marginPct: 28,
    status: 'won', openCount: 4, sentAt: 'Thu 11:40', lastActivity: 'Won Fri · became MR-2479',
    confidence: 94, memoryFactId: 'f-lane-nbo-kla', winProbability: 100, createdBy: 'user',
  },
  {
    id: 'Q-SV-01', tenantId: 'savannah', customer: 'Melcom', from: 'Accra', to: 'Kumasi',
    cargo: 'Assorted retail — 9t', weightT: 9,
    price: { amount: 5200, currency: 'GHS' }, cost: { amount: 4100, currency: 'GHS' }, marginPct: 27,
    status: 'opened', openCount: 2, sentAt: 'Mon 10:22', lastActivity: 'Opened 2×',
    confidence: 90, memoryFactId: 'f-lane-acc-kum', winProbability: 68, pickupDate: 'Wed', createdBy: 'conductor',
  },
  {
    id: 'Q-SV-02', tenantId: 'savannah', customer: 'Melcom', from: 'Accra', to: 'Ouagadougou',
    cargo: 'FMCG — 14t', weightT: 14,
    price: { amount: 26500, currency: 'GHS' }, cost: { amount: 19800, currency: 'GHS' }, marginPct: 34,
    status: 'won', openCount: 3, sentAt: 'Fri 16:10', lastActivity: 'Won Mon · became SV-106',
    confidence: 62, winProbability: 100, createdBy: 'user',
  },
];

export const memoryFacts: MemoryFact[] = [
  { id: 'f-lane-nbo-kla', tenantId: 'meridian', kind: 'lane', label: 'Nairobi→Kampala avg $1,850', value: '1850', confidence: 94, evidence: ['14 moves · last 90 days', 'Rate cards: Bidco, Twiga'], evidenceCount: 14, source: 'document', status: 'active', updatedAt: '12 May' },
  { id: 'f-lane-kla-nbo', tenantId: 'meridian', kind: 'lane', label: 'Kampala→Nairobi avg $1,720', value: '1720', confidence: 88, evidence: ['9 moves · last 90 days'], evidenceCount: 9, source: 'document', status: 'active', updatedAt: '10 May' },
  { id: 'f-border-pref', tenantId: 'meridian', kind: 'border', label: 'Prefer Busia 3.2h over Malaba 6.8h', value: '3.2 vs 6.8', confidence: 88, evidence: ['23 crossings · border telematics'], evidenceCount: 23, source: 'behavior', status: 'active', updatedAt: '13 May' },
  { id: 'f-customer-bidco', tenantId: 'meridian', kind: 'customer', label: 'Bidco prefers morning pickups', value: 'morning', confidence: 92, evidence: ['11 observations'], evidenceCount: 11, source: 'behavior', status: 'active', updatedAt: '9 May' },
  { id: 'f-pattern-sunday', tenantId: 'meridian', kind: 'pattern', label: 'Operator avoids Sunday departures', value: 'no-sunday', confidence: 76, evidence: ['8 observations', '2 rejections this month'], evidenceCount: 8, source: 'behavior', status: 'unreviewed', updatedAt: '13 May' },
  { id: 'f-partner-rwlink', tenantId: 'meridian', kind: 'partner', label: 'Rwanda Link · on-time 96% · docs 100%', value: '91', confidence: 91, evidence: ['12 handoffs · Kigali corridor'], evidenceCount: 12, source: 'behavior', status: 'active', updatedAt: '11 May' },
  { id: 'f-pricing-winrate', tenantId: 'meridian', kind: 'pricing', label: 'Win-rate 71% at ≤5% above avg · 22% at ≥15%', value: '71/22', confidence: 83, evidence: ['31 quotes · 6 months'], evidenceCount: 31, source: 'exchange', status: 'active', updatedAt: '12 May' },
  { id: 'f-lane-nbo-juba', tenantId: 'meridian', kind: 'lane', label: 'Nairobi→Juba — only 2 moves on record', value: '3400', confidence: 41, evidence: ['2 moves · 14 months ago'], evidenceCount: 2, source: 'document', status: 'active', updatedAt: '2 Apr' },
  { id: 'f-lane-acc-kum', tenantId: 'savannah', kind: 'lane', label: 'Accra→Kumasi avg GH₵4,900', value: '4900', confidence: 90, evidence: ['21 moves · last 90 days'], evidenceCount: 21, source: 'document', status: 'active', updatedAt: '12 May' },
  { id: 'f-customer-melcom', tenantId: 'savannah', kind: 'customer', label: 'Melcom pays in 14 days · never early', value: '14d', confidence: 85, evidence: ['9 invoices'], evidenceCount: 9, source: 'behavior', status: 'active', updatedAt: '8 May' },
  { id: 'f-pattern-tema', tenantId: 'savannah', kind: 'pattern', label: 'Friday Tema gate queues +3h', value: 'fri+3h', confidence: 79, evidence: ['6 observations'], evidenceCount: 6, source: 'behavior', status: 'unreviewed', updatedAt: '13 May' },
];

export const policies: Policy[] = [
  { id: 'p-margin', tenantId: 'meridian', label: 'Never quote below cost + 12% margin', kind: 'margin-floor', params: { pct: 12 }, enabled: true },
  { id: 'p-spend', tenantId: 'meridian', label: 'Auto-approve expenses ≤ $200', kind: 'spend-cap', params: { maxUsd: 200 }, enabled: true },
  { id: 'p-bidfloor', tenantId: 'meridian', label: 'Auto-bid floor $1,600 (KLA→NBO)', kind: 'bid-floor', params: { lane: 'Kampala→Nairobi', minUsd: 1600 }, enabled: true },
  { id: 'p-border', tenantId: 'meridian', label: 'Border delay > 6h → notify owner', kind: 'notify', params: { hours: 6 }, enabled: true },
  { id: 'p-docs', tenantId: 'meridian', label: 'Undocumented carrier → block, always', kind: 'block', params: {}, enabled: true },
  { id: 'p-window', tenantId: 'meridian', label: 'Customer updates 07:00–21:00 EAT only', kind: 'time-window', params: { from: '07:00', to: '21:00' }, enabled: true },
  { id: 'p-spend-sv', tenantId: 'savannah', label: 'Auto-approve expenses ≤ GH₵1,500', kind: 'spend-cap', params: { maxUsd: 120 }, enabled: true },
  { id: 'p-margin-sv', tenantId: 'savannah', label: 'Never quote below cost + 15% margin', kind: 'margin-floor', params: { pct: 15 }, enabled: true },
];

export const approvals: ApprovalAction[] = [
  {
    id: 'ap-bond', tenantId: 'meridian', title: 'Renew EAC transit bond — MR-2481',
    context: 'Bond expires in 36h · regulated document class',
    kind: 'expense',
    reasoning: [
      'Bond expires in 36h; agent renewal takes ~4h',
      '$180 is inside your ≤$200 auto-approve spend guardrail',
      'Document class is regulated — policy requires your approval',
    ],
    citedFactIds: ['f-border-pref'],
    impacts: [{ label: 'keeps MR-2481 moving', tone: 'ok' }, { label: 'avoids ~11h impound risk', tone: 'teal' }],
    confidence: 96, status: 'pending', createdAt: '05:58',
    amount: { amount: 180, currency: 'USD' }, movementId: 'MR-2481',
    payload: { docId: 'doc-bond' }, reversible: true,
  },
  {
    id: 'ap-bid', tenantId: 'meridian', title: 'Auto-bid $1,720 on Exchange load',
    context: 'Kampala→Nairobi · Thu · 18t packaged foods · Uwezo Logistics',
    kind: 'bid',
    reasoning: [
      'Lane average from your memory: $1,720 over 9 moves',
      'Bid sits inside your $1,600 floor for KLA→NBO',
      'Fits KDJ 482T’s Thursday return window exactly',
    ],
    citedFactIds: ['f-lane-kla-nbo'],
    impacts: [{ label: 'est. margin +$430', tone: 'ok' }, { label: 'fills empty backhaul', tone: 'teal' }],
    confidence: 88, status: 'pending', createdAt: '06:20',
    amount: { amount: 1720, currency: 'USD' }, exchangeLoadId: 'xl-1', reversible: true,
  },
  {
    id: 'ap-eta', tenantId: 'meridian', title: 'Send customer ETA update — MR-2481',
    context: 'Bidco Africa · delay +6h · autonomy: Suggest',
    kind: 'message',
    reasoning: [
      'Malaba wait trending 5.5h against your 6.8h average',
      'Delivery moves to Wed 11:00 — proactive beats the 09:00 call',
      'Inside your 07:00–21:00 EAT customer-update window',
    ],
    citedFactIds: ['f-border-pref', 'f-customer-bidco'],
    impacts: [{ label: 'protects Bidco trust score', tone: 'teal' }],
    confidence: 90, status: 'pending', createdAt: '07:44',
    movementId: 'MR-2481', reversible: false,
  },
  {
    id: 'ap-cap', tenantId: 'meridian', title: 'Post empty return leg to Exchange',
    context: 'KDJ 482T · Kampala→Nairobi · Thursday',
    kind: 'exchange-post',
    reasoning: [
      'KDJ 482T returns empty Thursday otherwise',
      '2 open loads match this window — best fit scores 97',
      'Posting is reversible until a bid is accepted',
    ],
    citedFactIds: ['f-lane-kla-nbo'],
    impacts: [{ label: 'est. margin +$640 combined', tone: 'ok' }],
    confidence: 84, status: 'pending', createdAt: '07:52',
    payload: { from: 'Kampala', to: 'Nairobi', date: 'Thu 16 May', vehiclePlate: 'KDJ 482T' },
    reversible: true,
  },
];

export const exchangeLoads: ExchangeLoad[] = [
  { id: 'xl-1', from: 'Kampala', to: 'Nairobi', cargo: 'Packaged foods — 18t', weightT: 18, date: 'Thu 16 May', price: { amount: 1760, currency: 'USD' }, poster: 'Uwezo Logistics', status: 'open' },
  { id: 'xl-2', from: 'Kampala', to: 'Nairobi', cargo: 'Beer empties — 15t', weightT: 15, date: 'Thu 16 May', price: { amount: 1610, currency: 'USD' }, poster: 'Nile Freight', status: 'open' },
  { id: 'xl-3', from: 'Mombasa', to: 'Nairobi', cargo: 'Steel coils — 24t', weightT: 24, date: 'Wed 15 May', price: { amount: 1380, currency: 'USD' }, poster: 'Coast Carriers', status: 'open' },
  { id: 'xl-4', from: 'Kigali', to: 'Kampala', cargo: 'Coffee — 16t', weightT: 16, date: 'Fri 17 May', price: { amount: 1180, currency: 'USD' }, poster: 'Rwanda Link Logistics', status: 'open' },
  { id: 'xl-sv-1', from: 'Kumasi', to: 'Accra', cargo: 'Timber — 10t', weightT: 10, date: 'Fri 17 May', price: { amount: 3800, currency: 'GHS' }, poster: 'Ashanti Timber Co.', status: 'open' },
];

export const exchangeCapacity: ExchangeCapacity[] = [
  { id: 'cap-1', tenantId: 'meridian', from: 'Mombasa', to: 'Nairobi', date: 'Wed 15 May', vehiclePlate: 'KBZ 214F', status: 'posted' },
];

export const ledger: LedgerEntry[] = [
  { id: 'lg-1', tenantId: 'meridian', time: '06:02', actor: 'conductor', actorName: 'Conductor', action: 'Drafted quote Q-311 for Bidco from lane memory', verdict: 'auto', verdictLabel: 'auto · inside policy', confidence: 94, reversible: false, undone: false, reasoning: ['Lane avg $1,850 ◈ 14 moves', 'Priced +3.8% — inside 71% win band'] },
  { id: 'lg-2', tenantId: 'meridian', time: '06:40', actor: 'system', actorName: 'System', action: 'MR-2479 POD verified · settlement queued', verdict: 'auto', verdictLabel: 'auto · inside policy', reversible: false, undone: false },
  { id: 'lg-3', tenantId: 'meridian', time: '07:15', actor: 'conductor', actorName: 'Conductor', action: 'Escalated bond renewal — regulated document class', verdict: 'escalated', verdictLabel: 'escalated · awaiting Wanjiru', confidence: 96, reversible: false, undone: false },
  { id: 'lg-4', tenantId: 'meridian', time: 'Mon 18:22', actor: 'user', actorName: 'Wanjiru', action: 'Border advance $120 approved', verdict: 'approved', verdictLabel: 'approved by Wanjiru', reversible: true, undone: false },
  { id: 'lg-sv-1', tenantId: 'savannah', time: '05:35', actor: 'conductor', actorName: 'Conductor', action: 'SV-104 departure confirmed with port release note', verdict: 'auto', verdictLabel: 'auto · inside policy', reversible: false, undone: false },
];

export const dockMessages: DockMessage[] = [
  {
    id: 'dm-brief', tenantId: 'meridian', kind: 'brief',
    text: 'Overnight watch recap: Malaba is the only story. MR-2481 is holding 5.5h against your 6.8h average; everything else is on plan.',
    sources: ['border telematics', 'your Malaba history ◈', 'exchange board', 'quote tracking pixel'],
    resolved: false, createdAt: '08:02',
  },
  {
    id: 'dm-suggest-cap', tenantId: 'meridian', kind: 'suggestion',
    text: 'Post KDJ 482T’s Thursday return as Exchange capacity — 2 loads fit the window, best fit 97.',
    actionId: 'ap-cap', resolved: false, createdAt: '08:04',
  },
  {
    id: 'dm-learn-sunday', tenantId: 'meridian', kind: 'learning',
    text: 'I noticed you rejected 2 Sunday departures. Make “no Sunday departures” a rule?',
    factIds: ['f-pattern-sunday'], resolved: false, createdAt: '08:05',
  },
  {
    id: 'dm-sv-brief', tenantId: 'savannah', kind: 'brief',
    text: 'Yaw left Tema at 05:50 and is clear of the port queues. Kumasi delivery is on plan for 13:30.',
    sources: ['GPS · GH 4521-24', 'port release note'],
    resolved: false, createdAt: '08:02',
  },
  {
    id: 'dm-sv-backhaul', tenantId: 'savannah', kind: 'suggestion',
    text: 'Kumasi→Accra timber load on the Exchange fits Yaw’s Friday return — GH₵3,800, fit 88.',
    resolved: false, createdAt: '08:06',
  },
];

export const defaultAutonomy: Record<string, AutonomyLevel> = {
  quoting: 'Suggest',
  dispatch: 'Approve',
  'customer-updates': 'Suggest',
  exchange: 'Approve',
  expenses: 'Approve',
  documents: 'Manual',
};