import EmptyState from '@/components/EmptyState';
import { useStore } from '@/store';

/** Placeholder page — replaced by the owning page agent. */
export default function Stub({ name, hint }: { name: string; hint?: string }) {
  const setCommandBarOpen = useStore((s) => s.setCommandBarOpen);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-h1 text-text-1">{name}</h1>
      <EmptyState
        title={`${name} is being wired up`}
        body={hint ?? 'This surface is under construction. The Conductor can already act across the whole OS.'}
        actionLabel="Ask or act…  ⌘K"
        onAction={() => setCommandBarOpen(true)}
      />
    </div>
  );
}
