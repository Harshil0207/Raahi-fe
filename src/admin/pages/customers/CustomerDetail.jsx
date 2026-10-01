import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { AccountActions } from '@/admin/components/users/AccountActions';
import { RideHistoryList } from '@/admin/components/users/RideHistoryList';
import { ComplaintList } from '@/admin/components/complaints/ComplaintList';
import { MetricTile } from '@/admin/components/dashboard/MetricTile';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CopyId,
  EmptyState,
  ErrorState,
  Skeleton
} from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as customerApi from '@/admin/services/customer.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { PAYMENT_STATUS_TONE, RIDE_STATUS_LABEL, RIDE_STATUS_TONE } from '@/admin/constants/status';
import { formatDateTime, formatDistance, formatMoney, humanise, shortAddress } from '@/admin/utils/format';

/** One customer: who they are, what they have done, and what they have reported. */
export default function CustomerDetail() {
  const { userId } = useParams();
  const { can } = useAuth();

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => customerApi.detail(userId), [userId]),
    [userId]
  );

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Customer" back="/customers" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Customer" back="/customers" />
        <ErrorState description={error.message} onRetry={refetch} />
      </>
    );
  }

  const { customer, stats, activeRide, rides, payments, complaints } = data;

  return (
    <>
      <PageHeader
        title={customer.name}
        back="/customers"
        description={customer.email}
        actions={
          <>
            <Badge tone={customer.isActive ? 'success' : 'danger'} dot>
              {customer.isActive ? 'Active' : 'Blocked'}
            </Badge>
            <AccountActions
              user={customer}
              api={customerApi}
              canEdit={can(PERMISSIONS.USERS_UPDATE)}
              canBlock={can(PERMISSIONS.USERS_BLOCK)}
              onChanged={refetch}
            />
          </>
        }
      >
        <p className="mt-1">
          <CopyId id={customer._id} label="customer id" />
        </p>
      </PageHeader>

      {activeRide && (
        <Card className="mb-4 border-[var(--accent)]">
          <CardHeader
            title="On a ride right now"
            action={
              can(PERMISSIONS.RIDES_READ) ? (
                <Link to={`/admin/rides/${activeRide._id}`} className="text-[12.5px] text-accent hover:underline">
                  Open the ride
                </Link>
              ) : null
            }
          />
          <CardBody className="flex flex-wrap items-center gap-3">
            <Badge tone={RIDE_STATUS_TONE[activeRide.status]} dot>
              {RIDE_STATUS_LABEL[activeRide.status] || activeRide.status}
            </Badge>
            <p className="min-w-0 flex-1 truncate text-[13px] text-body">
              {shortAddress(activeRide.pickup?.address)} <span className="text-faint">→</span>{' '}
              {shortAddress(activeRide.destination?.address)}
            </p>
            <span className="tabular text-[13px] text-muted">
              {formatMoney(activeRide.estimatedFare, activeRide.currency)}
            </span>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricTile label="Rides" value={stats.rides} />
        <MetricTile label="Completed" value={stats.completed} />
        <MetricTile
          label="Cancelled"
          value={stats.cancelled}
          tone={stats.cancelled > 0 && stats.cancelled / Math.max(stats.rides, 1) > 0.3 ? 'warning' : undefined}
        />
        <MetricTile label="Total spend" value={formatMoney(stats.spend)} />
        <MetricTile label="Distance" value={formatDistance(stats.distanceKm)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Profile" />
          <CardBody className="pt-1">
            <DetailList>
              <DetailRow label="Name">{customer.name}</DetailRow>
              <DetailRow label="Email">{customer.email}</DetailRow>
              <DetailRow label="Phone" mono>
                {customer.phone}
              </DetailRow>
              <DetailRow label="Joined">{formatDateTime(customer.createdAt)}</DetailRow>
              <DetailRow label="Last updated">{formatDateTime(customer.updatedAt)}</DetailRow>
              {/* No password, token or session detail is sent to the console at
                  all, so there is nothing here to redact. */}
            </DetailList>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent rides"
            action={
              can(PERMISSIONS.RIDES_READ) ? (
                <Link to={`/admin/rides?customerId=${userId}`} className="text-[12.5px] text-accent hover:underline">
                  All rides
                </Link>
              ) : null
            }
          />
          <RideHistoryList rides={rides} moreHref={`/rides?customerId=${userId}`} />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Complaints" description="Reports this customer has filed" />
          <ComplaintList complaints={complaints} />
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader
            title="Payments"
            action={
              can(PERMISSIONS.PAYMENTS_READ) ? (
                <Link to={`/admin/payments?customerId=${userId}`} className="text-[12.5px] text-accent hover:underline">
                  All
                </Link>
              ) : null
            }
          />
          {payments?.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {payments.slice(0, 8).map((payment) => (
                <li key={payment._id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="tabular min-w-0 flex-1 text-body">
                    {formatMoney(payment.amount, payment.currency)}
                    <span className="ml-2 text-muted">{payment.method}</span>
                  </span>
                  <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>{humanise(payment.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CreditCard} title="No payments" />
          )}
        </Card>
      </div>
    </>
  );
}
