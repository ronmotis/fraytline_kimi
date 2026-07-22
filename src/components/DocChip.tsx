import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileCheck2, FileClock, FileWarning, FileX2 } from 'lucide-react';
import type { Doc } from '@/store';
import { cn } from '@/lib/utils';

const CONF = {
  verified: { icon: FileCheck2, cls: 'text-ok border-ok/30 bg-ok/10', label: 'verified' },
  pending: { icon: FileClock, cls: 'text-warn border-warn/30 bg-warn/10', label: 'pending' },
  expiring: { icon: FileWarning, cls: 'text-warn border-warn/30 bg-warn/10', label: 'expiring' },
  missing: { icon: FileX2, cls: 'text-danger border-danger/40 bg-transparent border-dashed', label: 'missing' },
} as const;

/** Document status pill (§9.13) — click reveals extracted fields checklist. */
export default function DocChip({ doc }: { doc: Doc }) {
  const [open, setOpen] = useState(false);
  const c = CONF[doc.status];
  const Icon = c.icon;
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('inline-flex items-center gap-1.5 rounded-chip border px-2 py-1 text-caption transition-colors hover:border-line-strong', c.cls)}
      >
        <Icon className="h-3.5 w-3.5" />
        {doc.name}
        {doc.status === 'expiring' && doc.expiresInHours !== undefined && (
          <span className="font-mono text-[10px]">{doc.expiresInHours}h</span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass absolute left-0 top-full z-50 mt-1.5 w-64 rounded-card border border-line-strong p-3 shadow-modal"
          >
            <div className="mb-1 text-micro uppercase text-text-3">{c.label} · extracted fields</div>
            {doc.fields && doc.fields.length > 0 ? (
              <div className="space-y-1">
                {doc.fields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-2 text-caption">
                    <span className="text-text-3">{f.label}</span>
                    <span className="rounded bg-teal-dim px-1.5 py-0.5 font-mono text-[11px] text-teal">◈ {f.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-caption text-text-3">Preview placeholder — no fields extracted yet.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
