import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/common';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  pagination?: { page: number; pageSize: number; total: number; onPage: (page: number) => void };
}

export function DataTable<T extends { id: string }>({ columns, rows, loading, error, onRetry, onRowClick, empty, pagination }: DataTableProps<T>) {
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (!loading && rows && rows.length === 0) return <>{empty ?? <EmptyState />}</>;

  return (
    <>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-cloud/80">
              {columns.map((c) => (
                <th key={c.header} className={cn('whitespace-nowrap px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted first:pl-5', c.align === 'right' && 'text-right', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && !rows
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.header} className={cn('px-4 py-3.5 first:pl-5', c.className)}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => (
                  <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('transition-colors hover:bg-brand-50/30', onRowClick && 'cursor-pointer')}>
                    {columns.map((c) => (
                      <td key={c.header} className={cn('whitespace-nowrap px-4 py-3.5 text-ink first:pl-5', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total > pagination.pageSize && <Pagination {...pagination} />}
    </>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-muted">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2 font-medium text-ink">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
