// People & Roles tab (network.md §2): people table + "see Fraytline through
// their eyes" role preview wired to the global switchRole, plus invite flow.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Lock, Plus, UserPlus, X } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import type { Person, Role } from '@/store';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { cn } from '@/lib/utils';
import { PERSON_META } from './networkData';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const ROLE_CHIP: Record<string, string> = {
  Owner: 'border-ember/40 bg-ember-dim text-ember',
  Dispatcher: 'border-teal/40 bg-teal-dim text-teal',
  Finance: 'border-quote/40 bg-quote/10 text-quote',
  Driver: 'border-line-strong bg-surface-2 text-text-2',
  Partner: 'border-dashed border-line-strong text-text-3',
};

const ROLE_CARDS: { role: Role; lens: string; route: string }[] = [
  { role: 'Owner', lens: 'Business pulse: margin, cash, growth, approvals.', route: '/today' },
  { role: 'Dispatcher', lens: 'Exceptions first. Unassigned first. Map large.', route: '/today' },
  { role: 'Finance', lens: 'Settlements, advances, aging. Money columns everywhere.', route: '/today' },
  { role: 'Driver', lens: 'One run. Checkpoints, docs, POD. Nothing else.', route: '/dispatch' },
  { role: 'Customer', lens: 'Their shipment, their docs, your brand. Read-only.', route: '/movements' },
];

export default function PeopleTab() {
  const tenant = useActiveTenant();
  const people = useStore((s) => s.people.filter((p) => p.tenantId === s.activeTenantId));
  const role = useStore((s) => s.role);
  const switchRole = useStore((s) => s.switchRole);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const canEdit = role === 'Owner';
  const [inviteOpen, setInviteOpen] = useState(false);

  const columns: Column<Person>[] = [
    {
      key: 'person',
      label: 'Person',
      render: (p) => (
        <span className="flex items-center gap-2.5">
          {p.avatar ? (
            <img src={p.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] font-semibold text-text-2">
              {p.name.split(' ').map((w) => w[0]).join('')}
            </span>
          )}
          <span>
            <span className="block text-small text-text-1">{p.name}</span>
            <span className="block text-caption text-text-3">{p.title}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (p) => (
        <span className={cn('inline-flex rounded-chip border px-2 py-0.5 text-micro uppercase', ROLE_CHIP[p.role] ?? ROLE_CHIP.Driver)}>
          {p.role}
        </span>
      ),
    },
    { key: 'branch', label: 'Branch', render: (p) => <span className="text-text-2">{PERSON_META[p.id]?.branch ?? tenant.branch}</span> },
    { key: 'active', label: 'Last active', mono: true, sortable: true, sortValue: (p) => PERSON_META[p.id]?.lastActive ?? '', render: (p) => PERSON_META[p.id]?.lastActive ?? '—' },
  ];

  const preview = (r: Role, route: string) => {
    switchRole(r);
    navigate(route);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      {/* left — people table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-micro uppercase text-text-3">{people.length} people · {tenant.name}</div>
          <button
            onClick={() => canEdit && setInviteOpen(true)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1.5 text-caption transition-colors',
              canEdit ? 'border-line-strong text-text-2 hover:border-teal hover:text-teal' : 'cursor-not-allowed border-line-hairline text-text-3',
            )}
            title={canEdit ? undefined : 'Owner only'}
          >
            {canEdit ? <UserPlus className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
            Invite person
          </button>
        </div>
        <DataTable columns={columns} rows={people} rowKey={(p) => p.id} />
      </div>

      {/* right — role preview */}
      <div>
        <h3 className="font-display text-h3 text-text-1">See Fraytline through their eyes</h3>
        <p className="mt-1 text-caption text-text-2">Same data, same routes — the lens changes.</p>
        <div className="mt-3 space-y-2.5">
          {ROLE_CARDS.map((r, i) => {
            const isCurrent = role === r.role;
            return (
              <motion.div
                key={r.role}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.24, ease: EASE }}
                className={cn(
                  'flex items-center gap-3 rounded-card border p-3.5 transition-all duration-150',
                  isCurrent ? 'border-teal/40 bg-teal-dim' : 'border-line-hairline bg-surface-1 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-glow-teal',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-small font-medium text-text-1">
                    {r.role}
                    {isCurrent && <span className="rounded-chip border border-teal/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal">viewing</span>}
                  </div>
                  <div className="mt-0.5 text-caption text-text-2">{r.lens}</div>
                </div>
                <button
                  onClick={() => preview(r.role, r.route)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-chip border border-line-strong px-2.5 py-1.5 text-caption font-medium text-text-2 transition-colors hover:border-teal hover:text-teal"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSent={(email) => {
          setInviteOpen(false);
          pushToast({ title: 'Invite sent · role-scoped access', body: email, tone: 'teal' });
        }} />}
      </AnimatePresence>
    </div>
  );
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: (email: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Dispatcher');
  const valid = name.trim() && /.+@.+\..+/.test(email);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[16vh]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-canvas/60 backdrop-blur-[8px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass relative w-[480px] max-w-[calc(100vw-32px)] rounded-modal border border-line-strong p-6 shadow-modal"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-text-3 transition-colors hover:text-text-1">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-micro uppercase text-text-3">
          <Plus className="h-3.5 w-3.5" /> Invite person
        </div>
        <div className="mt-1.5 font-display text-h2 text-text-1">Role-scoped from the first login</div>

        <label className="mt-5 block text-caption text-text-3">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="mt-1.5 w-full rounded-card border border-line-strong bg-surface-2 px-3 py-2.5 text-body text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
        />
        <label className="mt-4 block text-caption text-text-3">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className="mt-1.5 w-full rounded-card border border-line-strong bg-surface-2 px-3 py-2.5 text-body text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
        />
        <label className="mt-4 block text-caption text-text-3">Role</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(['Owner', 'Dispatcher', 'Finance', 'Driver'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                'rounded-chip border px-2.5 py-1.5 text-caption transition-colors',
                role === r ? 'border-teal bg-teal-dim text-teal' : 'border-line-hairline text-text-2 hover:border-line-strong',
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-chip border border-line-hairline px-4 py-2 text-small text-text-2 transition-colors hover:border-line-strong hover:text-text-1">
            Cancel
          </button>
          <button
            onClick={() => valid && onSent(email)}
            disabled={!valid}
            className={cn(
              'rounded-chip px-4 py-2 text-small font-medium transition-colors',
              valid ? 'bg-ember text-canvas hover:bg-ember-hi' : 'cursor-not-allowed bg-surface-3 text-text-3',
            )}
          >
            Send invite
          </button>
        </div>
      </motion.div>
    </div>
  );
}
