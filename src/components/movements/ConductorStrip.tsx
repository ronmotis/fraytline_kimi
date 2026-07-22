// Conductor strip (movements.md §B4) — full-width teal-hairline strip: the why +
// suggested actions, every evidence clause cited with a MemoryChip.
// Slides up on scroll-into-view (300ms); text word-reveals (20ms/word, max 600ms).
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import type { ApprovalAction, Movement } from '@/store';
import MemoryChip from '@/components/MemoryChip';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Seg =
  | { t: 'text'; text: string; strong?: boolean }
  | { t: 'fact'; factId: string }
  | { t: 'chip'; label: string; confidence: number }
  | { t: 'action'; approval: ApprovalAction; label: string };

function WordReveal({ text, strong, baseDelay }: { text: string; strong?: boolean; baseDelay: number }) {
  const words = text.split(' ');
  return (
    <span className={strong ? 'text-text-1 font-semibold' : undefined}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ delay: Math.min(baseDelay + i * 0.02, 0.6), duration: 0.2 }}
          className="inline-block whitespace-pre"
        >
          {w}{' '}
        </motion.span>
      ))}
    </span>
  );
}

export default function ConductorStrip({
  movement,
  movementApprovals,
}: {
  movement: Movement;
  movementApprovals: ApprovalAction[];
}) {
  const approveAction = useStore((s) => s.approveAction);

  // scripted-but-dynamic strip content — evidence clauses cite real memory facts
  const segs: Seg[] = [];
  if (movement.id === 'MR-2481') {
    segs.push(
      { t: 'text', text: 'Why Malaba, not Busia?', strong: true },
      { t: 'text', text: 'This corridor exits KE via Malaba by distance; your' },
      { t: 'fact', factId: 'f-border-pref' },
      { t: 'text', text: 'applies to Nairobi–Kampala. Bond renewal drafted; customer update drafted (delay +6h vs promise) —' },
    );
    const eta = movementApprovals.find((a) => a.kind === 'message');
    if (eta) segs.push({ t: 'action', approval: eta, label: 'Review & send' });
    segs.push({ t: 'text', text: 'Rwanda Link confirmed trailer swap 14:30.' });
  } else {
    if (movement.nextMilestone) {
      segs.push({
        t: 'text',
        text: `Next: ${movement.nextMilestone}${movement.nextMilestoneInH !== undefined ? ` in ~${movement.nextMilestoneInH}h` : ''}.`,
        strong: true,
      });
    }
    if (movement.exceptionNote) {
      segs.push({ t: 'text', text: `${movement.exceptionNote} —` });
      const action = movementApprovals[0];
      if (action) segs.push({ t: 'action', approval: action, label: 'Review drafted action' });
    }
    if (movement.id === 'MR-2485') {
      segs.push({ t: 'fact', factId: 'f-lane-nbo-juba' }, { t: 'text', text: '— I’ll ask before assuming rates on this corridor.' });
    }
    if (movement.id === 'SV-104') {
      segs.push({ t: 'text', text: 'Yaw is clear of the port queues; Kumasi delivery on plan for 13:30.' });
    }
    if (movement.id === 'SV-106') {
      segs.push(
        { t: 'text', text: 'First cross-border in a while — the Paga dossier is assembled from' },
        { t: 'chip', label: 'your ECOWAS doc habits', confidence: 62 },
        { t: 'text', text: '.' },
      );
    }
    if (movement.id === 'MR-2479') {
      segs.push({ t: 'text', text: 'POD signed Mon 15:42. Settlement tracking against Twiga’s 21-day terms.' });
    }
    if (movement.id === 'MR-2483') {
      segs.push(
        { t: 'text', text: 'Pickup in 26h and no unit assigned — KDL 117C is available Thu and fits.' },
        { t: 'fact', factId: 'f-lane-kla-nbo' },
      );
    }
  }

  let wordBudget = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-panel border border-teal/25 border-t-2 border-t-teal/60 bg-teal-dim/30 px-5 py-4"
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-small text-text-2">
        <span className="mr-1 flex items-center gap-1.5 text-teal">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-dot" />
          <span className="text-micro uppercase">Conductor on {movement.id}</span>
        </span>
        {segs.map((s, i) => {
          if (s.t === 'text') {
            const delay = wordBudget * 0.02;
            wordBudget += s.text.split(' ').length;
            return <WordReveal key={i} text={s.text} strong={s.strong} baseDelay={delay} />;
          }
          if (s.t === 'fact') return <MemoryChip key={i} factId={s.factId} />;
          if (s.t === 'chip') return <MemoryChip key={i} label={s.label} confidence={s.confidence} source="behavior" />;
          const done = s.approval.status !== 'pending';
          return (
            <button
              key={i}
              onClick={() => approveAction(s.approval.id)}
              disabled={done}
              className="rounded-chip bg-ember px-2.5 py-1 text-caption font-medium text-canvas transition-colors hover:bg-ember-hi disabled:cursor-default disabled:bg-ok"
            >
              {done ? 'Sent ✓' : s.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
