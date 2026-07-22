// Partners tab (network.md §4): trust computed from shared history — partner
// cards with trust rings + memory facts, trust explainer, invite-partner flow.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Handshake, MessageSquare, Plus, Send, X } from 'lucide-react';
import { useStore, useActiveTenant } from '@/store';
import ConfidenceRing from '@/components/ConfidenceRing';
import MemoryChip from '@/components/MemoryChip';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

interface Partner {
  id: string;
  name: string;
  location: string;
  type: 'Subcontractor' | 'Agent' | 'Exchange';
  trust: number;
  stats: string;
  avatar?: string;
  contact?: string;
  factId?: string;
  extraChip?: { label: string; confidence: number };
  lanes: string[];
}

const PARTNERS: Record<string, Partner[]> = {
  meridian: [
    {
      id: 'pt-rwlink', name: 'Rwanda Link Logistics', location: 'Kigali, Rwanda', type: 'Subcontractor', trust: 91,
      stats: 'on-time 96% · docs 100% · 23 jobs · pays in 9d', avatar: '/avatar-grace.png', contact: 'Grace Uwase',
      factId: 'f-partner-rwlink', extraChip: { label: 'pays in 9 days avg', confidence: 91 },
      lanes: ['Kampala→Kigali', 'Gatuna corridor'],
    },
    {
      id: 'pt-malaba', name: 'Malaba Customs Agent', location: 'Malaba border, KE/UG', type: 'Agent', trust: 88,
      stats: 'avg clearance 6.8h · bond renewals ~4h · 41 clearances',
      extraChip: { label: 'avg Malaba clearance 6.8h', confidence: 88 },
      lanes: ['Malaba', 'Busia'],
    },
    {
      id: 'pt-transafrica', name: 'TransAfrica Cargo', location: 'Nairobi, Kenya', type: 'Exchange', trust: 84,
      stats: '4.8 rating · 23 jobs · payment speed 96%',
      extraChip: { label: 'payment speed 96%', confidence: 84 },
      lanes: ['KLA→NBO', 'MBA→NBO'],
    },
  ],
  savannah: [
    {
      id: 'pt-tema', name: 'Tema Port Agent', location: 'Tema, Ghana', type: 'Agent', trust: 86,
      stats: 'port releases same-day · 31 releases · docs 98%',
      factId: 'f-pattern-tema', extraChip: { label: 'port release notes auto-filed', confidence: 86 },
      lanes: ['Tema→Accra'],
    },
  ],
};

const TYPE_CLS: Record<Partner['type'], string> = {
  Subcontractor: 'border-teal/40 bg-teal-dim text-teal',
  Agent: 'border-warn/40 bg-warn/10 text-warn',
  Exchange: 'border-quote/40 bg-quote/10 text-quote',
};

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function PartnersTab() {
  const tenant = useActiveTenant();
  const pushToast = useStore((s) => s.pushToast);
  const [inviteOpen, setInviteOpen] = useState(false);
  const partners = PARTNERS[tenant.id] ?? [];

  return (
    <div className="space-y-4">
      {/* trust explainer strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE }}
        className="flex flex-wrap items-center gap-2 rounded-card border border-line-hairline bg-surface-1 p-4 text-small text-text-2"
      >
        <Handshake className="h-4 w-4 shrink-0 text-teal" />
        Trust is computed from your shared history
        <MemoryChip
          label="on-time · docs · disputes · payment"
          confidence={94}
          source="behavior"
          evidence={['computed from your ledger — no manual reviews']}
        />
        No manual reviews; nothing to game.
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {partners.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3, ease: EASE }}
            className="flex flex-col rounded-card border border-line-hairline bg-surface-1 p-5 transition-colors hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="h-10 w-10 rounded-card object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-card bg-surface-3 font-mono text-data font-semibold text-text-2">
                    {initials(p.name)}
                  </span>
                )}
                <div>
                  <div className="text-body-strong text-text-1">{p.name}</div>
                  <div className="text-caption text-text-3">{p.location}{p.contact ? ` · ${p.contact}` : ''}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ConfidenceRing value={p.trust} size={40} showLabel />
                <span className="text-micro uppercase text-text-3">trust</span>
              </div>
            </div>

            <div className="mt-2.5">
              <span className={cn('inline-flex rounded-chip border px-2 py-0.5 text-micro uppercase', TYPE_CLS[p.type])}>{p.type}</span>
            </div>

            <div className="mt-3 font-mono text-data text-text-2">{p.stats}</div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {p.factId && <MemoryChip factId={p.factId} />}
              {p.extraChip && (
                <MemoryChip label={p.extraChip.label} confidence={p.extraChip.confidence} source="behavior" evidence={['shared job ledger ◈']} />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.lanes.map((l, j) => (
                <motion.span
                  key={l}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.07 + j * 0.04, ...SPRING }}
                  className="rounded-chip border border-line-hairline bg-surface-2 px-2 py-0.5 font-mono text-caption text-text-2"
                >
                  {l}
                </motion.span>
              ))}
            </div>

            <div className="mt-4 flex gap-2 border-t border-line-hairline pt-3.5">
              <button
                onClick={() => pushToast({ title: `Message thread opened · ${p.name}`, body: 'delivered via Exchange relay · logged', tone: 'teal' })}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-chip border border-line-strong px-3 py-2 text-small text-text-2 transition-colors hover:border-teal hover:text-teal"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </button>
              <button
                onClick={() => pushToast({ title: `${p.name} invited to job`, body: 'they see fit score + your trust badge · logged to Ledger', tone: 'ok', ledgerLink: true })}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-chip bg-ember px-3 py-2 text-small font-medium text-canvas transition-colors hover:bg-ember-hi"
              >
                <Send className="h-3.5 w-3.5" /> Invite to job
              </button>
            </div>
          </motion.div>
        ))}

        {/* invite partner — dashed card */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: partners.length * 0.07 + 0.1, duration: 0.3 }}
          onClick={() => setInviteOpen(true)}
          className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-text-2 transition-colors hover:border-teal hover:text-teal"
        >
          <Plus className="h-5 w-5" />
          <span className="text-small">Invite partner</span>
          <span className="max-w-[220px] text-center text-caption text-text-3">Their first job starts building trust immediately.</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {inviteOpen && (
          <InvitePartnerModal
            onClose={() => setInviteOpen(false)}
            onSent={(email) => {
              setInviteOpen(false);
              pushToast({ title: 'Invite sent', body: `${email} · their first job starts building trust immediately`, tone: 'teal' });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InvitePartnerModal({ onClose, onSent }: { onClose: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<Partner['type']>('Subcontractor');
  const [lanes, setLanes] = useState('');
  const valid = /.+@.+\..+/.test(email);

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
        <div className="text-micro uppercase text-text-3">Invite partner</div>
        <div className="mt-1.5 font-display text-h2 text-text-1">Trust starts with the first job</div>

        <label className="mt-5 block text-caption text-text-3">Email</label>
        <input
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ops@partner.com"
          className="mt-1.5 w-full rounded-card border border-line-strong bg-surface-2 px-3 py-2.5 text-body text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
        />
        <label className="mt-4 block text-caption text-text-3">Type</label>
        <div className="mt-1.5 flex gap-1.5">
          {(['Subcontractor', 'Agent', 'Exchange'] as Partner['type'][]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'rounded-chip border px-2.5 py-1.5 text-caption transition-colors',
                type === t ? 'border-teal bg-teal-dim text-teal' : 'border-line-hairline text-text-2 hover:border-line-strong',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-caption text-text-3">Shared lanes</label>
        <input
          value={lanes}
          onChange={(e) => setLanes(e.target.value)}
          placeholder="e.g. Kampala→Kigali"
          className="mt-1.5 w-full rounded-card border border-line-strong bg-surface-2 px-3 py-2.5 font-mono text-data text-text-1 outline-none placeholder:text-text-3 focus:border-teal"
        />

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
