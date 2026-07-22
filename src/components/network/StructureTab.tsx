// Structure tab (network.md §1): org tree HQ → branches with drawing connectors,
// the "add branch / country" extensibility flow, and a branch detail drawer
// whose control-requirement toggle writes a real governance rule (teachFact).
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Globe, Lock, Plus, X } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';
import { BRANCHES, COUNTRY_OPTIONS, PERSON_META, SAVANNAH_COUNTRY_OPTIONS } from './networkData';
import type { Branch } from './networkData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

const ROW_H = 104;
const ROW_GAP = 16;

export default function StructureTab() {
  const tenant = useActiveTenant();
  const role = useStore((s) => s.role);
  const people = useStore((s) => s.people.filter((p) => p.tenantId === s.activeTenantId));
  const pushToast = useStore((s) => s.pushToast);
  const teachFact = useStore((s) => s.teachFact);
  const canEdit = role === 'Owner';

  const [added, setAdded] = useState<Branch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [dualSignoff, setDualSignoff] = useState<Record<string, boolean>>({});

  const all = useMemo(() => [...(BRANCHES[tenant.id] ?? []), ...added], [tenant.id, added]);
  const hq = all.find((b) => b.isHQ) ?? all[0];
  const branches = all.filter((b) => b.id !== hq?.id);

  // tree geometry (deterministic: fixed row height)
  const rows = branches.length + 1; // + add-branch card
  const colH = rows * ROW_H + (rows - 1) * ROW_GAP;
  const hqY = colH / 2;

  const toggleDual = (b: Branch) => {
    if (!canEdit) return;
    const next = !dualSignoff[b.id];
    setDualSignoff((d) => ({ ...d, [b.id]: next }));
    if (next) {
      teachFact({ label: `${b.name}: dual sign-off required above $5,000`, kind: 'rule' });
    } else {
      pushToast({ title: 'Control requirement removed', body: `${b.name} · dual sign-off off · logged to Ledger`, tone: 'ember', ledgerLink: true });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-micro uppercase text-text-3">
          <Building2 className="h-3.5 w-3.5" />
          {tenant.name} · org structure
        </div>
        {!canEdit && (
          <span className="inline-flex items-center gap-1.5 text-caption text-text-3">
            <Lock className="h-3 w-3" /> read-only — only the Owner edits structure & controls
          </span>
        )}
      </div>

      {/* org tree */}
      <div className="flex items-center gap-0">
        {/* HQ node */}
        <motion.button
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          onClick={() => hq && setSelected(hq)}
          className="glass w-64 shrink-0 self-center rounded-card border border-ember/40 p-5 text-left transition-colors hover:border-ember"
          style={{ height: ROW_H + 24 }}
        >
          <div className="text-micro uppercase text-ember">HQ</div>
          <div className="mt-1 font-display text-h3 font-semibold text-text-1">{hq?.name}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip>{hq?.countryCode}</Chip>
            <Chip>{hq?.currency}</Chip>
            <Chip>{hq?.staff} people</Chip>
          </div>
        </motion.button>

        {/* connectors */}
        {branches.length > 0 && (
          <svg width="80" height={colH} viewBox={`0 0 80 ${colH}`} className="shrink-0">
            {branches.map((b, i) => {
              const y = i * (ROW_H + ROW_GAP) + ROW_H / 2;
              return (
                <motion.path
                  key={b.id}
                  d={`M 0 ${hqY} C 40 ${hqY}, 40 ${y}, 80 ${y}`}
                  fill="none"
                  stroke={b.added ? 'var(--teal)' : 'var(--line-strong)'}
                  strokeWidth="1"
                  pathLength={1}
                  initial={{ strokeDashoffset: 1, strokeDasharray: 1 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ delay: 0.3 + i * 0.2, duration: 0.5, ease: EASE }}
                />
              );
            })}
          </svg>
        )}

        {/* branch column */}
        <div className="w-full max-w-sm" style={{ minHeight: colH }}>
          <div className="flex flex-col" style={{ gap: ROW_GAP }}>
            {branches.map((b, i) => (
              <motion.button
                key={b.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + i * 0.2, ...SPRING }}
                onClick={() => setSelected(b)}
                className={cn(
                  'w-full rounded-card border p-4 text-left transition-colors hover:border-line-strong',
                  b.added ? 'border-teal/40 bg-teal-dim/40' : 'border-line-hairline bg-surface-1',
                )}
                style={{ height: ROW_H }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-h3 font-semibold text-text-1">{b.name}</div>
                    <div className="text-caption text-text-3">{b.note}</div>
                  </div>
                  <span className="font-mono text-data text-text-2">{b.movementsWeek}<span className="text-caption text-text-3">/wk</span></span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[b.countryCode, b.currency, `${b.staff} people`].map((c, j) => (
                    <motion.span
                      key={c}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.2 + j * 0.04, ...SPRING }}
                    >
                      <Chip>{c}</Chip>
                    </motion.span>
                  ))}
                  {b.compliance.map((c, j) => (
                    <motion.span
                      key={c}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.72 + i * 0.2 + j * 0.04, ...SPRING }}
                      className="inline-flex items-center rounded-chip border border-teal/30 bg-teal-dim px-2 py-0.5 text-caption text-teal"
                    >
                      {c}
                    </motion.span>
                  ))}
                </div>
              </motion.button>
            ))}

            {/* add branch — the extensibility demo */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + branches.length * 0.2, duration: 0.3 }}
              onClick={() => canEdit && setModalOpen(true)}
              disabled={!canEdit}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-card border border-dashed text-small transition-colors',
                canEdit
                  ? 'border-line-strong text-text-2 hover:border-teal hover:text-teal'
                  : 'cursor-not-allowed border-line-hairline text-text-3',
              )}
              style={{ height: ROW_H }}
            >
              {canEdit ? <Plus className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              Add branch
            </motion.button>
          </div>
        </div>
      </div>

      {tenant.id === 'savannah' && (
        <p className="text-caption text-text-2">
          Growing? Add a branch, a country, a partner — the system stretches; you never migrate.
        </p>
      )}

      {/* add-branch modal */}
      <AnimatePresence>
        {modalOpen && (
          <AddBranchModal
            tenantId={tenant.id}
            onClose={() => setModalOpen(false)}
            onCreate={(b) => {
              setAdded((a) => [...a, b]);
              setModalOpen(false);
              pushToast({
                title: `${b.name} branch created`,
                body: 'Corridors, currencies, and document rules now available — nothing else to migrate.',
                tone: 'ok',
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* branch drawer */}
      <AnimatePresence>
        {selected && (
          <BranchDrawer
            branch={selected}
            people={people.filter((p) => (PERSON_META[p.id]?.branch ?? '').startsWith(selected.name.split(' ')[0]))}
            canEdit={canEdit}
            dual={!!dualSignoff[selected.id]}
            onToggleDual={() => toggleDual(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-chip border border-line-hairline bg-surface-2 px-2 py-0.5 text-caption text-text-2">
      {children}
    </span>
  );
}

// ---------- add-branch modal ----------

function AddBranchModal({
  tenantId,
  onClose,
  onCreate,
}: {
  tenantId: string;
  onClose: () => void;
  onCreate: (b: Branch) => void;
}) {
  const options = tenantId === 'savannah' ? SAVANNAH_COUNTRY_OPTIONS : COUNTRY_OPTIONS;
  const [name, setName] = useState('');
  const [country, setCountry] = useState<(typeof options)[number] | null>(null);

  const create = () => {
    if (!name.trim() || !country) return;
    onCreate({
      id: `br-${Date.now()}`,
      name: name.trim(),
      country: country.name,
      countryCode: country.code,
      currency: country.currency,
      compliance: ['EAC transit'],
      staff: 0,
      movementsWeek: 0,
      note: 'new · memory starts learning immediately',
      added: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[16vh]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-[rgba(14,13,11,0.6)] backdrop-blur-[8px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass relative w-[520px] max-w-[calc(100vw-32px)] rounded-modal border border-line-strong p-6 shadow-modal"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-text-3 transition-colors hover:text-text-1">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-micro uppercase text-text-3">
          <Globe className="h-3.5 w-3.5" /> Add branch / country
        </div>
        <div className="mt-1.5 font-display text-h2 text-text-1">The system stretches — nothing to migrate</div>

        <label className="mt-5 block text-caption text-text-3">Branch name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tenantId === 'savannah' ? 'e.g. Kumasi' : 'e.g. Dar es Salaam'}
          className="mt-1.5 w-full rounded-card border border-line-strong bg-surface-2 px-3 py-2.5 text-body text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
        />

        <label className="mt-4 block text-caption text-text-3">Country</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {options.map((c) => (
            <button
              key={c.code}
              onClick={() => setCountry(c)}
              className={cn(
                'rounded-chip border px-2.5 py-1.5 text-caption transition-colors',
                country?.code === c.code ? 'border-teal bg-teal-dim text-teal' : 'border-line-hairline text-text-2 hover:border-line-strong',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {country && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="mt-4 space-y-2 rounded-card border border-teal/30 bg-teal-dim p-3"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-chip border border-teal/40 px-2 py-0.5 font-mono text-caption text-teal">{country.currency}</span>
                <span className="text-caption text-teal">detected — added to money model</span>
              </div>
              <div className="text-caption text-text-2">◈ {country.compliance}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-chip border border-line-hairline px-4 py-2 text-small text-text-2 transition-colors hover:border-line-strong hover:text-text-1">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!name.trim() || !country}
            className={cn(
              'rounded-chip px-4 py-2 text-small font-medium transition-colors',
              name.trim() && country ? 'bg-ember text-canvas hover:bg-ember-hi' : 'cursor-not-allowed bg-surface-3 text-text-3',
            )}
          >
            Create branch
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- branch detail drawer ----------

function BranchDrawer({
  branch,
  people,
  canEdit,
  dual,
  onToggleDual,
  onClose,
}: {
  branch: Branch;
  people: { id: string; name: string; role: string; avatar?: string }[];
  canEdit: boolean;
  dual: boolean;
  onToggleDual: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-[rgba(14,13,11,0.6)] backdrop-blur-[8px]" />
      <motion.div
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="absolute bottom-0 right-0 top-0 w-[480px] max-w-full overflow-y-auto border-l border-line-strong bg-surface-1 p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-micro uppercase text-text-3">Branch</div>
            <div className="mt-1 font-display text-h2 text-text-1">{branch.name}</div>
            <div className="mt-0.5 text-caption text-text-2">{branch.country} · {branch.note}</div>
          </div>
          <button onClick={onClose} className="text-text-3 transition-colors hover:text-text-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip>{branch.countryCode}</Chip>
          <Chip>{branch.currency}</Chip>
          {branch.compliance.map((c) => (
            <span key={c} className="inline-flex items-center rounded-chip border border-teal/30 bg-teal-dim px-2 py-0.5 text-caption text-teal">{c}</span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-card border border-line-hairline bg-surface-2 p-4">
            <div className="text-micro uppercase text-text-3">Movements / week</div>
            <div className="mt-1 font-mono text-data-lg text-text-1">{branch.movementsWeek}</div>
          </div>
          <div className="rounded-card border border-line-hairline bg-surface-2 p-4">
            <div className="text-micro uppercase text-text-3">Currency balance</div>
            <div className="mt-1 font-mono text-data-lg text-text-1">{branch.currency} {(branch.staff * 214).toLocaleString()}k</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-micro uppercase text-text-3">People · {branch.staff}</div>
          <div className="mt-2 space-y-2">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-card border border-line-hairline bg-surface-2 p-2.5">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] text-text-2">
                    {p.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                )}
                <span className="flex-1 text-small text-text-1">{p.name}</span>
                <span className="text-caption text-text-3">{p.role}</span>
              </div>
            ))}
            {people.length === 0 && <div className="text-small text-text-3">Team assignments appear here as people join this branch.</div>}
          </div>
        </div>

        <div className="mt-5 rounded-card border border-line-hairline bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-small font-medium text-text-1">Require dual sign-off &gt; $5,000</div>
              <div className="mt-0.5 text-caption text-text-3">Writes a governance rule into the Operator Model ◈</div>
            </div>
            <button
              onClick={onToggleDual}
              disabled={!canEdit}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors duration-150',
                dual ? 'bg-teal' : 'bg-surface-3',
                !canEdit && 'cursor-not-allowed opacity-40',
              )}
              title={canEdit ? undefined : 'Owner only'}
            >
              <motion.span
                layout
                transition={SPRING}
                className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-text-1', dual ? 'right-0.5' : 'left-0.5')}
              />
            </button>
          </div>
          {!canEdit && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-caption text-text-3">
              <Lock className="h-3 w-3" /> only the Owner changes control requirements
            </div>
          )}
          {dual && (
            <div className="mt-2.5">
              <MemoryChip label={`${branch.name}: dual sign-off required above $5,000`} confidence={55} source="you" evidence={['taught by you · just now']} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
