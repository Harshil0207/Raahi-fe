import { ChevronRight } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { cn } from '@/lib/utils';

/**
 * The console's one table.
 *
 * Two renderings of the same columns, not one squeezed into the other. From `lg`
 * it is a real table, because comparing thirty rows across five fields is what a
 * table is for. Below that each row becomes a card: the same data, stacked and
 * legible, rather than a table scrolled sideways through a 6mm window.
 *
 * A column declares `primary` to lead the card, `secondary` for the line under
 * it, and `hideBelow` to stay out of the card entirely — a rider's licence
 * number is useful in a wide table and noise on a phone.
 *
 * Columns are objects: { key, header, render, align, width, primary, secondary,
 * hideBelow, className }.
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id || row._id,
  onRowClick,
  loading = false,
  error = null,
  onRetry,
  empty = {},
  className,
  // Shown while a refetch is in flight but the previous page is still on screen.
  refreshing = false
}) {
  if (error) {
    return <ErrorState description={error.message} onRetry={onRetry} />;
  }

  if (loading && !rows?.length) {
    return <TableSkeleton columns={columns} />;
  }

  if (!rows?.length) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title || 'Nothing here'}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  const cardColumns = columns.filter((column) => !column.hideBelow);
  const primary = columns.find((column) => column.primary) || columns[0];
  const secondary = columns.find((column) => column.secondary);

  return (
    <div className={cn('relative', refreshing && 'opacity-60 transition-opacity', className)}>
      {/* Wide: a real table. */}
      <div className="hidden lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hair">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center'
                  )}
                >
                  {column.header}
                </th>
              ))}
              {onRowClick && <th className="w-8" aria-label="Open" />}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-hair last:border-0',
                  onRowClick && 'cursor-pointer transition-colors hover:bg-[var(--surface-hover)]'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-2.5 align-middle text-[13px] text-body',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.className
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {onRowClick && (
                  <td className="pr-3 text-right">
                    <ChevronRight className="size-4 text-faint" aria-hidden />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow: one card per row. */}
      <ul className="divide-y divide-[var(--border)] lg:hidden">
        {rows.map((row) => {
          const rest = cardColumns.filter((column) => column !== primary && column !== secondary);

          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-body">{primary.render(row)}</div>
                  {secondary && <div className="mt-0.5 text-[12.5px] text-muted">{secondary.render(row)}</div>}
                </div>
                {onRowClick && <ChevronRight className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />}
              </div>

              {rest.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {rest.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-faint">{column.header}</dt>
                      <dd className="mt-0.5 truncate text-[13px] text-body">{column.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );

          return (
            <li key={rowKey(row)}>
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  className="w-full px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  {content}
                </button>
              ) : (
                <div className="px-4 py-3.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TableSkeleton({ columns }) {
  return (
    <div className="px-4 py-3">
      <div className="hidden gap-4 lg:flex">
        {columns.map((column) => (
          <Skeleton key={column.key} className="h-3 flex-1" />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Page controls.
 *
 * Deliberately count-based rather than infinite scroll: an operator needs to
 * know there are 1,284 rides this week, and needs to be able to come back to
 * page 4.
 */
export function Pagination({ page, limit, total, onPage, className }) {
  if (!total) return null;

  const pages = Math.max(Math.ceil(total / limit), 1);
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-hair px-4 py-2.5 text-[12.5px]',
        className
      )}
    >
      <p className="tabular text-muted">
        {first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </p>

      <div className="flex items-center gap-1">
        <PagerButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </PagerButton>
        <span className="tabular px-2 text-muted">
          {page} / {pages}
        </span>
        <PagerButton disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({ disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // 36px on a phone so it is a real tap target; tighter on a desktop
        // row where the pointer is precise.
        'h-9 rounded-[var(--radius-field)] border border-firm px-3 font-medium transition-colors md:h-7 md:px-2.5',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--surface-hover)]'
      )}
    >
      {children}
    </button>
  );
}
