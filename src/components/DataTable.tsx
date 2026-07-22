import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  mono?: boolean;
  align?: 'left' | 'right';
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

/** Dense ops table (§9.8): 44px rows, micro headers, mono numerals, sortable, staggered entry. */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  className?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const col = columns.find((c) => c.key === sort.key);
        const va = col?.sortValue ? col.sortValue(a) : '';
        const vb = col?.sortValue ? col.sortValue(b) : '';
        return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
      })
    : rows;

  return (
    <div className={cn('overflow-x-auto rounded-panel border border-line-hairline bg-surface-1', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-2">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-3 py-2.5 text-micro uppercase text-text-3 first:pl-4 last:pr-4',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.sortable && 'cursor-pointer select-none hover:text-text-2',
                )}
                onClick={() => c.sortable && setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortable && (
                    <ChevronDown
                      className={cn('h-3 w-3 transition-transform duration-150', sort?.key === c.key && sort.dir === -1 && 'rotate-180', sort?.key === c.key ? 'opacity-100' : 'opacity-30')}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const key = rowKey(row);
            const selected = selectedKey === key;
            return (
              <motion.tr
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'h-11 border-t border-line-hairline transition-colors duration-150',
                  onRowClick && 'cursor-pointer',
                  selected ? 'bg-surface-3 shadow-[inset_2px_0_0_var(--ember)]' : 'hover:bg-surface-2',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-2 text-small text-text-1 first:pl-4 last:pr-4',
                      c.mono && 'font-mono text-data',
                      c.align === 'right' && 'text-right',
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
