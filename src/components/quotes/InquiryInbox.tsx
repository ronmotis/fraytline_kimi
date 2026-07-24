import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MessageCircle, Globe, ArrowRight, X, Inbox as InboxIcon } from 'lucide-react';
import { useStore, useTenantInquiries, laneLabel } from '@/store';
import type { Inquiry, Quote } from '@/store';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const CHANNEL_ICON: Record<Inquiry['channel'], typeof Mail> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  portal: Globe,
};

/** Customer inquiries waiting to be triaged into quotes — the top of the sales funnel. */
export default function InquiryInbox({ onQuoted }: { onQuoted: (q: Quote) => void }) {
  const inquiries = useTenantInquiries();
  const quoteFromInquiry = useStore((s) => s.quoteFromInquiry);
  const closeInquiry = useStore((s) => s.closeInquiry);

  const open = inquiries.filter((i) => i.status !== 'closed');
  if (open.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <InboxIcon className="h-3.5 w-3.5 text-text-3" />
        <span className="text-micro uppercase tracking-wide text-text-3">Inquiries</span>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-text-2">
          {open.filter((i) => i.status === 'new').length} new
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <AnimatePresence initial={false}>
          {open.map((inq, i) => {
            const Icon = CHANNEL_ICON[inq.channel];
            const quoted = inq.status === 'quoted';
            return (
              <motion.div
                layout
                key={inq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                className="w-[280px] shrink-0 rounded-card border border-line-hairline bg-surface-1 p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-chip bg-surface-3">
                    <Icon className="h-3 w-3 text-text-2" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-small font-medium text-text-1">{inq.customer}</span>
                  <span className="font-mono text-[10px] text-text-3">{inq.receivedAt}</span>
                </div>
                <div className="mt-2 font-mono text-data text-teal">{laneLabel(inq.from, inq.to)}</div>
                <div className="mt-0.5 truncate text-caption text-text-2">
                  {inq.cargo} · {inq.weightT}t
                </div>
                {inq.note && <div className="mt-1.5 truncate text-caption text-text-3">{inq.note}</div>}
                <div className="mt-3 flex items-center gap-2">
                  {quoted ? (
                    <span className="rounded-chip bg-teal-dim px-2.5 py-1 text-caption font-medium text-teal">
                      Quoted {inq.quoteId}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const q = quoteFromInquiry(inq.id);
                        if (q) onQuoted(q);
                      }}
                      className="flex items-center gap-1 rounded-chip bg-ember px-2.5 py-1 text-caption font-medium text-canvas transition-colors hover:bg-ember-hi"
                    >
                      Quote this <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => closeInquiry(inq.id)}
                    title="Close inquiry (no quote)"
                    className={cn('ml-auto rounded p-1 text-text-3 transition-colors hover:text-danger', quoted && 'invisible')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
