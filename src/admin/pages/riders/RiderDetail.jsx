import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PowerOff } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { AccountActions } from '@/admin/components/users/AccountActions';
import { RideHistoryList } from '@/admin/components/users/RideHistoryList';
import { ComplaintList } from '@/admin/components/complaints/ComplaintList';
import { RiderFinance } from '@/admin/components/finance/RiderFinance';
import { ConfirmDialog } from '@/admin/components/common/Dialog';
import { MetricTile } from '@/admin/components/dashboard/MetricTile';
import { Button } from '@/admin/components/ui/button';
import { Badge, Card, CardBody, CardHeader, CopyId, ErrorState, LiveDot, Skeleton } from '@/admin/components/ui/misc';
import { DailyBarChart } from '@/admin/components/charts/TrendChart';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as riderApi from '@/admin/services/rider.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { RIDE_STATUS_LABEL, RIDE_STATUS_TONE } from '@/admin/constants/status';
import {
  compactMoney,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatMoney,
  formatPercent,
  formatRelative,
  shortAddress
} from '@/admin/utils/format';

/**
 * One rider: status, vehicle, earnings and history.
 *
 * Earnings and rates come from the same server-side aggregates the rider's own
 * app shows them, so support and the rider are looking at the same numbers when
 * they talk about a payout.
 */
export default function RiderDetail() {
  const { riderId } = useParams();
  const { can } = useAuth();
  const [confirmOffline, setConfirmOffline] = useState(false);

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => riderApi.detail(riderId), [riderId]),
    [riderId]
  );

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Rider" back="/riders" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Rider" back="/riders" />
        <ErrorState description={error.message} onRetry={refetch} />
      </>
    );
  }

  const { rider, activeRide, rides, complaints, earnings, stats } = data;
  const user = rider.user;
  const currency = earnings?.currency || 'INR';

  return (
    <>
      <PageHeader
        title={user?.name || 'Rider'}
        back="/riders"
        description={user?.email}
        actions={
          <>
            <Badge tone={rider.isOnline ? 'success' : 'neutral'} dot>
              {rider.isOnline ? (rider.activeRideId ? 'On a ride' : 'Online and free') : 'Offline'}
            </Badge>

            {rider.isOnline && !rider.activeRideId && can(PERMISSIONS.RIDERS_UPDATE) && (
              <Button size="md" variant="dangerOutline" onClick={() => setConfirmOffline(true)}>
                <PowerOff aria-hidden />
                Take offline
              </Button>
            )}

            {user && (
              <AccountActions
                user={user}
                api={riderApi}
                canEdit={can(PERMISSIONS.RIDERS_UPDATE)}
                canBlock={can(PERMISSIONS.RIDERS_BLOCK)}
                onChanged={refetch}
              />
            )}
          </>
        }
      >
        <p className="mt-1 flex items-center gap-2">
          <CopyId id={rider.id} label="rider id" />
          {rider.isOnline && rider.onlineSince && (
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <LiveDot />
              online since {formatRelative(rider.onlineSince)}
            </span>
          )}
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
            <span className="text-[12.5px] text-muted">{activeRide.customerId?.name}</span>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Today" value={formatMoney(earnings?.today?.total ?? 0, currency)} />
        <MetricTile label="This week" value={formatMoney(earnings?.week?.total ?? 0, currency)} />
        {/* Counted from rides still awaiting payment. It used to come from a
            figure derived within completed rides, which is always zero — a
            ride only completes once its money has posted. */}
        <MetricTile
          label="Unsettled"
          value={formatMoney(earnings?.unsettled?.total ?? 0, currency)}
          tone={earnings?.unsettled?.total > 0 ? 'warning' : undefined}
          hint="Driven but not paid for"
        />
        <MetricTile label="Trips" value={stats?.totalTrips ?? 0} />
        <MetricTile
          label="Acceptance"
          value={stats?.acceptanceRate == null ? 'No data' : formatPercent(stats.acceptanceRate)}
          hint={stats?.offersReceived ? `${stats.offersReceived} offers` : 'No offers yet'}
        />
        <MetricTile label="Time online" value={formatDuration(stats?.onlineSeconds)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <Card>
            <CardHeader title="Profile" />
            <CardBody className="pt-1">
              <DetailList>
                <DetailRow label="Name">{user?.name}</DetailRow>
                <DetailRow label="Email">{user?.email}</DetailRow>
                <DetailRow label="Phone" mono>
                  {user?.phone}
                </DetailRow>
                <DetailRow label="Joined">{formatDateTime(rider.createdAt)}</DetailRow>
                <DetailRow label="Account">
                  <Badge tone={user?.isActive ? 'success' : 'danger'}>
                    {user?.isActive ? 'Active' : 'Blocked'}
                  </Badge>
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Vehicle and documents" />
            <CardBody className="pt-1">
              <DetailList>
                <DetailRow label="Number plate" mono>
                  {rider.vehicle?.numberPlate}
                </DetailRow>
                <DetailRow label="Type">
                  <span className="capitalize">{rider.vehicle?.type}</span>
                </DetailRow>
                <DetailRow label="Make and model">
                  <span className="capitalize">
                    {[rider.vehicle?.make, rider.vehicle?.model].filter(Boolean).join(' ') || '—'}
                  </span>
                </DetailRow>
                <DetailRow label="Colour">
                  <span className="capitalize">{rider.vehicle?.color}</span>
                </DetailRow>
                <DetailRow label="Licence" mono>
                  {rider.licence?.number}
                </DetailRow>
              </DetailList>
              <p className="mt-2 text-[11.5px] text-faint">
                Document images are not held by the platform, so there are none to show here.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Last known position" description="Sent by the rider's app while online" />
            <CardBody className="pt-1">
              {rider.currentLocation?.coordinates ? (
                <DetailList>
                  <DetailRow label="Coordinates" mono>
                    {rider.currentLocation.coordinates[1].toFixed(5)},{' '}
                    {rider.currentLocation.coordinates[0].toFixed(5)}
                  </DetailRow>
                  <DetailRow label="Received">{formatRelative(rider.lastLocationAt)}</DetailRow>
                </DetailList>
              ) : (
                <p className="text-[13px] text-faint">
                  This rider has never sent a position. They cannot go online until they do.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Earnings"
              description="Last 14 days, from completed rides"
              action={
                <span className="tabular text-[13px] font-semibold text-body">
                  {formatMoney(earnings?.allTime?.total ?? 0, currency)} all time
                </span>
              }
            />
            <CardBody>
              <DailyBarChart
                days={earnings?.breakdown || []}
                valueKey="total"
                label="earned"
                format={(v) => compactMoney(v, currency)}
              />
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hair pt-4 sm:grid-cols-4">
                <Figure label="Cash collected" value={formatMoney(earnings?.allTime?.cash ?? 0, currency)} />
                <Figure label="UPI" value={formatMoney(earnings?.allTime?.upi ?? 0, currency)} />
                <Figure label="Per trip" value={formatMoney(earnings?.allTime?.avgPerTrip ?? 0, currency)} />
                <Figure label="Distance" value={formatDistance(stats?.totalDistanceKm)} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent rides"
              action={
                can(PERMISSIONS.RIDES_READ) ? (
                  <Link to={`/admin/rides?riderId=${riderId}`} className="text-[12.5px] text-accent hover:underline">
                    All rides
                  </Link>
                ) : null
              }
            />
            <RideHistoryList rides={rides} moreHref={`/rides?riderId=${riderId}`} />
          </Card>

          <Card>
            <CardHeader title="Complaints" description="Reports this rider has filed" />
            <ComplaintList complaints={complaints} />
          </Card>
        </div>
      </div>

      {/* Its own band rather than a column: the ledger is a long list, and
          squeezed into two thirds of a grid it reads worse than it does on a
          phone. */}
      {can(PERMISSIONS.FINANCE_READ) && <RiderFinance riderId={riderId} />}

      <ConfirmDialog
        open={confirmOffline}
        onOpenChange={setConfirmOffline}
        title="Take this rider offline"
        description="They stop receiving ride requests and will have to go online again themselves. The console cannot put a rider online — only they know whether they are available to drive."
        confirmLabel="Take them offline"
        tone="danger"
        requireReason
        reasonLabel="Why?"
        reasonHint="The rider is told, and this goes in the audit log."
        onConfirm={async (reason) => {
          await riderApi.forceOffline(riderId, reason);
          toast.success('Rider taken offline');
          refetch();
        }}
      />
    </>
  );
}

function Figure({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="tabular mt-0.5 text-[14px] font-medium text-body">{value}</p>
    </div>
  );
}
