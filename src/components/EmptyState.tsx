import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';

/**
 * Never a dead end (design.md §9.15): numeral/icon, one sentence, teach/do action.
 */
export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-panel border border-line-hairline bg-surface-1 p-10 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] bg-cover bg-center"
        style={{ backgroundImage: "url('/signal-field-fallback.png')" }}
      />
      <Icon className="relative mb-4 h-10 w-10 text-text-3" strokeWidth={1.25} />
      <div className="relative font-display text-h2 text-text-1">{title}</div>
      <p className="relative mt-2 max-w-sm text-body text-text-2">{body}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="relative mt-5 rounded-chip border border-teal/40 bg-teal-dim px-4 py-2 text-small font-medium text-teal transition-colors hover:border-teal"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
