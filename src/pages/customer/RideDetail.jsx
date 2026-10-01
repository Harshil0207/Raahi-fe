import { Navigate, useParams } from 'react-router-dom';
import { AppBar } from '@/components/common/AppBar';
import { Card, CardBody } from '@/components/ui/card';
import { StatusBadge, Skeleton } from '@/components/ui/misc';
import { RoutePreview } from '@/components/ride/RoutePreview';
import { FareSummary } from '@/components/ride/FareSummary';
import { PersonCard } from '@/components/ride/PersonCard';
import { RateTrip } from '@/components/ride/RateTrip';
import { PaymentPanel } from '@/components/customer/PaymentPanel';
import { useRide } from '@/hooks/useRide';
import { RIDE_STATUS, STATUS_LABEL, STATUS_TONE, PAYMENT_STATUS } from '@/constants/ride';
import { formatDateTime, formatDistance, formatMoney } from '@/utils/format';

export default function RideDetail() {
  const { rideId } = useParams();
  const { ride, loading, error, refetch } = useRide(rideId);

  if (loading) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        <AppBar title="Trip" back />
        <div className="space-y-3 px-4">
          <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }

  if (error || !ride) return <Navigate to="/rides" replace />;

  const settled = ride.payment?.status === PAYMENT_STATUS.PAID;
  const awaitingPayment = ride.status === RIDE_STATUS.COMPLETED && !settled;

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar
        title="Trip details"
        subtitle={formatDateTime(ride.createdAt)}
        back="/rides"
        right={<StatusBadge tone={STATUS_TONE[ride.status]}>{STATUS_LABEL[ride.status]}</StatusBadge>}
      />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        <Card>
          <CardBody className="space-y-4">
            <FareSummary
              label={ride.finalFare != null ? 'Total fare' : 'Estimated fare'}
              fare={ride.finalFare ?? ride.estimatedFare}
              currency={ride.currency}
              distanceKm={ride.finalDistanceKm ?? ride.estimatedDistanceKm}
              durationMin={ride.estimatedDurationMin}
            />
            <RoutePreview
              className="border-t border-hair pt-4"
              pickup={ride.pickup?.address}
              destination={ride.destination?.address}
            />
          </CardBody>
        </Card>

        {ride.rider && (
          <Card>
            <CardBody>
              <PersonCard
                name={ride.rider.name}
                phone={settled ? null : ride.rider.phone}
                vehicle={ride.rider.vehicle}
                rating={ride.rider.rating}
                trips={ride.rider.totalRides}
              />
            </CardBody>
          </Card>
        )}

        {ride.status === RIDE_STATUS.COMPLETED && (
          <Card>
            <CardBody>
              <RateTrip
                rideId={rideId}
                side="rider"
                personName={ride.rider?.name}
                rating={ride.rating}
                onRated={refetch}
              />
            </CardBody>
          </Card>
        )}

        {awaitingPayment && (
          <Card>
            <CardBody>
              <PaymentPanel
                    rideId={rideId}
                    payment={ride.payment}
                    amount={ride.finalFare}
                    currency={ride.currency}
                    onChanged={refetch}
                  />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="space-y-2.5 text-sm">
            <Row label="Rate" value={`${formatMoney(ride.fareRatePerKm, ride.currency)} per km`} />
            <Row
              label="Distance"
              value={formatDistance(ride.finalDistanceKm ?? ride.estimatedDistanceKm)}
            />
            {ride.startedAt && <Row label="Started" value={formatDateTime(ride.startedAt)} />}
            {ride.completedAt && <Row label="Completed" value={formatDateTime(ride.completedAt)} />}
            {ride.cancellation?.at && (
              <Row
                label="Cancelled"
                value={`${formatDateTime(ride.cancellation.at)} by ${ride.cancellation.by}`}
              />
            )}
            {ride.payment?.method && (
              <Row label="Payment" value={`${ride.payment.method} · ${ride.payment.status}`} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="tabular text-right font-medium text-body">{value}</span>
    </div>
  );
}
