// Network (network.md): the "one product, any size" exhibit — tenant switcher
// cards, org structure, people & roles (role preview), fleet, partner network.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TenantExhibit from '@/components/network/TenantExhibit';
import StructureTab from '@/components/network/StructureTab';
import PeopleTab from '@/components/network/PeopleTab';
import FleetTab from '@/components/network/FleetTab';
import PartnersTab from '@/components/network/PartnersTab';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Tab = 'structure' | 'people' | 'fleet' | 'partners';

const TABS: [Tab, string][] = [
  ['structure', 'Structure'],
  ['people', 'People & Roles'],
  ['fleet', 'Fleet'],
  ['partners', 'Partners'],
];

export default function Network() {
  const [tab, setTab] = useState<Tab>('structure');

  return (
    <div className="space-y-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE }}
      >
        <h1 className="font-display text-h1 text-text-1">Network</h1>
        <p className="mt-1 text-body text-text-2">
          One operating system — tenants, branches, people, fleet, and partners at any scale.
        </p>
      </motion.div>

      {/* Section 0 — tenant switcher exhibit */}
      <TenantExhibit />

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-line-hairline">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2.5 text-small font-medium transition-colors duration-150',
              tab === t ? 'text-text-1' : 'text-text-3 hover:text-text-2',
            )}
          >
            {label}
            {tab === t && (
              <motion.span
                layoutId="network-tab"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ember"
              />
            )}
          </button>
        ))}
      </div>

      {/* tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: EASE }}
        >
          {tab === 'structure' && <StructureTab />}
          {tab === 'people' && <PeopleTab />}
          {tab === 'fleet' && <FleetTab />}
          {tab === 'partners' && <PartnersTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
