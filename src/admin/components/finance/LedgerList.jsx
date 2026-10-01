import { ScrollText } from 'lucide-react';
import { EmptyState, Skeleton } from '@/admin/components/ui/misc';
import { LEDGER_DIRECTION, LEDGER_TYPE_LABEL } from '@/admin/constants/finance';
import { formatMoney, formatRelative, humanise } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * The wallet ledger, as a list rather than a table.
 *
 * Every row carries a description that is a sentence, so a table would spend
 * most of its width on one column and still wrap it. A list reads the same at
 * 390px and at 1600px.
 *
 * The sign comes from `direction`, never from the number: `amount` is always a
 * positive magnitude. A MEMO gets no sign and no running balance at all —
 * commission and gateway money are facts recorded against a ride, and a memo
 * dressed up with a + or a − would read as money that moved when none did.
 */
export function LedgerList({ entries, currency, loading = false, empty = {} }) {
  if (loading && !entries?.length) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <EmptyState
        icon={ScrollText}
        title={empty.title || 'No entries recorded'}
        description={empty.description}
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {entries.map((entry) => {
        const memo = entry.direction === LEDGER_DIRECTION.MEMO;
        const label = LEDGER_TYPE_LABEL[entry.type] || humanise(entry.type);

        return (
          <li key={entry._id} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className={cn('text-[13px]', memo ? 'text-muted' : 'text-body')}>
                {entry.description || label}
              </p>

              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted">
                <span>{label}</span>
                <span className="text-faint" aria-hidden>
                  ·
                </span>
                <span>{formatRelative(entry.createdAt)}</span>
                {memo && (
                  <>
                    <span className="text-faint" aria-hidden>
                      ·
                    </span>
                    <span className="text-faint">memo, balance unchanged</span>
                  </>
                )}
              </p>

              {entry.reason && <p className="mt-1 text-[12px] italic text-muted">“{entry.reason}”</p>}
            </div>

            <div className="shrink-0 text-right">
              <p
                className={cn(
                  'tabular text-[13px] font-medium',
                  memo && 'font-normal text-faint',
                  !memo && entry.direction === LEDGER_DIRECTION.CREDIT && 'text-[var(--success)]',
                  !memo && entry.direction === LEDGER_DIRECTION.DEBIT && 'text-body'
                )}
              >
                {SIGN[entry.direction] || ''}
                {formatMoney(entry.amount, entry.currency || currency)}
              </p>

              {!memo && entry.balanceAfter != null && (
                <p className="tabular mt-0.5 text-[11.5px] text-muted">
                  {formatMoney(entry.balanceAfter, entry.currency || currency)} after
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// A proper minus sign, not a hyphen: it lines up with the plus at this size.
const SIGN = { [LEDGER_DIRECTION.CREDIT]: '+', [LEDGER_DIRECTION.DEBIT]: '−' };
