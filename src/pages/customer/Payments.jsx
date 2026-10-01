import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ArrowRight } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton, StatusBadge } from '@/components/ui/misc';
import * as paymentApi from '@/services/payment.api';
import { formatMoney, formatDateTime, shortAddress } from '@/utils/format';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_STATUS_LABEL } from '@/constants/ride';

/**
 * What this person has paid, and what is still open.
 *
 * Every figure on this screen comes from the server. Nothing is summed here —
 * not the fare, not a total — because a number the client worked out is a
 * number the client could be wrong about, and this is the screen somebody
 * checks when they think they have been charged twice.
 *
 * The list is the person's own by construction: the endpoint takes no id, so
 * there is no parameter on this page that could point it at anybody else.
 */
const PAGE_SIZE = 20;

export default function CustomerPayments() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (page) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await paymentApi.listMyPayments({ page, limit: PAGE_SIZE });
      if (!alive.current) return;

      setItems((current) => (page === 1 ? data.items : [...current, ...data.items]));
      setMeta({ page: data.page, pages: data.pages, total: data.total });
      setError(null);
    } catch (err) {
      if (alive.current) setError(err?.message || 'Your payments could not be loaded.');
    } finally {
      if (alive.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const hasMore = meta.page < meta.pages;

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar
        title="Your payments"
        subtitle={meta.total ? `${meta.total} in total` : undefined}
      />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-card)]" />
          ))}

        {!loading && error && (
          <EmptyState
            icon={Receipt}
            title="Couldn't load your payments"
            description={error}
            action={
              <Button variant="outline" onClick={() => load(1)}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && !items.length && (
          <EmptyState
            icon={Receipt}
            title="Nothing paid yet"
            description="Fares you pay for your trips will be listed here."
          />
        )}

        {items.map((payment) => (
          <PaymentRow key={payment.id} payment={payment} />
        ))}

        {hasMore && !error && (
          <Button variant="outline" block loading={loadingMore} onClick={() => load(meta.page + 1)}>
            Show older payments
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * One fare.
 *
 * A payment still open keeps its link to the trip, because that is where it can
 * be finished. A settled one links to the trip summary. Neither carries a
 * gateway reference: the server does not send one, and there is nothing a
 * person can do with it that they cannot do with the trip.
 */
function PaymentRow({ payment }) {
  const { tone, label } = statusOf(payment);
  const ride = payment.ride;
  const open = payment.status === PAYMENT_STATUS.PENDING || !!payment.checkoutUrl;

  const to = ride ? (open ? `/ride/${ride.id}` : `/rides/${ride.id}`) : null;

  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-body">
          {ride?.destination ? shortAddress(ride.destination) : 'Trip fare'}
        </p>
        {ride?.pickup && (
          <p className="mt-0.5 truncate text-xs text-muted">from {shortAddress(ride.pickup)}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          {formatDateTime(ride?.at || payment.createdAt)}
          {payment.method ? ` · ${payment.method === PAYMENT_METHOD.CASH ? 'Cash' : 'Online'}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-sm font-semibold text-body">{formatMoney(payment.amount, payment.currency)}</p>
        <StatusBadge tone={tone}>{label}</StatusBadge>
        {to && <ArrowRight className="size-4 text-muted" aria-hidden />}
      </div>
    </>
  );

  const shell = 'flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-hair p-4';

  return to ? (
    <Link to={to} className={`${shell} bg-elevated transition-colors hover:bg-[var(--surface-sunken)]`}>
      {body}
    </Link>
  ) : (
    <div className={`${shell} bg-surface`}>{body}</div>
  );
}

/**
 * What a payment's state should read as, and how loudly.
 *
 * A refund in flight is deliberately not called "Refunded" — the money has not
 * arrived, and a screen that says it has is the same lie the backend refuses to
 * tell. It says the refund is on its way, and changes only when the gateway has
 * confirmed it.
 */
function statusOf(payment) {
  const refundPending =
    payment.refund && payment.refund.status !== PAYMENT_STATUS.PAID && payment.status !== PAYMENT_STATUS.REFUNDED;

  if (refundPending) return { tone: 'warning', label: 'Refund on its way' };

  switch (payment.status) {
    case PAYMENT_STATUS.PAID:
      return { tone: 'positive', label: 'Paid' };
    case PAYMENT_STATUS.REFUNDED:
      return { tone: 'positive', label: 'Refunded' };
    case PAYMENT_STATUS.FAILED:
      return { tone: 'danger', label: 'Failed' };
    default:
      return { tone: 'neutral', label: PAYMENT_STATUS_LABEL[payment.status] || 'Pending' };
  }
}
