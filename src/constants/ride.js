// Mirrors src/constants/rideStatus.js on the backend. The server is authoritative;
// these exist so the UI can label and order states, never to decide them.
export const RIDE_STATUS = {
  SEARCHING: 'SEARCHING',
  ACCEPTED: 'ACCEPTED',
  ARRIVING: 'ARRIVING',
  ARRIVED: 'ARRIVED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  IN_PROGRESS: 'IN_PROGRESS',
  // The journey is over and the fare is fixed; the money has not landed yet.
  // A ride sits here while the rider takes cash or the customer scans a code,
  // which is why COMPLETED can go on meaning "done and paid for".
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const ACTIVE_STATUSES = [
  RIDE_STATUS.SEARCHING,
  RIDE_STATUS.ACCEPTED,
  RIDE_STATUS.ARRIVING,
  RIDE_STATUS.ARRIVED,
  RIDE_STATUS.OTP_VERIFIED,
  RIDE_STATUS.IN_PROGRESS,
  RIDE_STATUS.AWAITING_PAYMENT
];

/** The journey is over, whether or not the money is in. */
export const isFinished = (status) =>
  status === RIDE_STATUS.AWAITING_PAYMENT || status === RIDE_STATUS.COMPLETED;

export const isActive = (status) => ACTIVE_STATUSES.includes(status);

export const STATUS_LABEL = {
  SEARCHING: 'Finding a rider',
  ACCEPTED: 'Rider assigned',
  ARRIVING: 'Rider on the way',
  ARRIVED: 'Rider has arrived',
  OTP_VERIFIED: 'Ready to go',
  IN_PROGRESS: 'On the trip',
  AWAITING_PAYMENT: 'Awaiting payment',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const STATUS_TONE = {
  SEARCHING: 'warning',
  ACCEPTED: 'accent',
  ARRIVING: 'accent',
  ARRIVED: 'accent',
  OTP_VERIFIED: 'accent',
  IN_PROGRESS: 'accent',
  AWAITING_PAYMENT: 'warning',
  COMPLETED: 'positive',
  CANCELLED: 'danger'
};

// Progress rail shown on the tracking screen.
export const TRIP_STEPS = [
  { key: RIDE_STATUS.ACCEPTED, label: 'Assigned' },
  { key: RIDE_STATUS.ARRIVED, label: 'At pickup' },
  { key: RIDE_STATUS.IN_PROGRESS, label: 'On trip' },
  { key: RIDE_STATUS.AWAITING_PAYMENT, label: 'Payment' },
  { key: RIDE_STATUS.COMPLETED, label: 'Done' }
];

/**
 * Pickup code length.
 *
 * The authoritative value is the admin setting `ride.otpLength` (4–6, default 4)
 * and the API validates against 4–6. Neither the ride payload nor GET /settings
 * carries that number, so the rider app cannot read it: this is the default the
 * rider screen assumes, and `OtpInput` takes it as a prop so the day it becomes
 * readable only the call site changes.
 *
 * The customer side does not need it — a fetched code tells OtpDisplay its own
 * length.
 */
export const OTP_LENGTH = 4;
export const OTP_LENGTH_RANGE = { min: 4, max: 6 };

export const PAYMENT_METHOD = { CASH: 'CASH', UPI: 'UPI' };

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  // Written before PROCESSING existed. Read as equivalent; nothing sends it.
  INITIATED: 'INITIATED',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

export const PAYMENT_STATUS_LABEL = {
  PENDING: 'Payment pending',
  INITIATED: 'Waiting for payment',
  PROCESSING: 'Waiting for payment',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  CANCELLED: 'Payment cancelled',
  REFUNDED: 'Refunded'
};

/** Money has been asked for and has not arrived. */
export const IN_FLIGHT_PAYMENT = [PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.PROCESSING];

// ------------------------------------------------------------------ wallet
//
// Mirrors src/constants/finance.js on the backend. The one thing worth
// repeating here: a ledger `amount` is always a positive magnitude and the sign
// lives in `direction`. MEMO moves nothing — it records a fact about the ride
// (the platform's commission, or money a gateway collected) that never passed
// through the rider's balance.
export const LEDGER_DIRECTION = { CREDIT: 'CREDIT', DEBIT: 'DEBIT', MEMO: 'MEMO' };

export const LEDGER_TYPE_LABEL = {
  RIDE_EARNING: 'Ride earning',
  PLATFORM_COMMISSION: 'Platform commission',
  CASH_COLLECTION: 'Cash collected',
  UPI_PAYMENT: 'Paid online',
  RIDER_RECHARGE: 'Recharge',
  ADMIN_ADJUSTMENT: 'Adjustment',
  REFUND: 'Refund'
};

export const WALLET_STATUS = { ACTIVE: 'ACTIVE', PAYMENT_REQUIRED: 'PAYMENT_REQUIRED' };

export const RECHARGE_STATUS_LABEL = {
  PENDING: 'Not started',
  PROCESSING: 'Waiting for payment',
  PAID: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
};

export const RECHARGE_STATUS_TONE = {
  PENDING: 'neutral',
  PROCESSING: 'warning',
  PAID: 'positive',
  FAILED: 'danger',
  CANCELLED: 'neutral'
};

/**
 * Mirrors src/constants/services.js on the backend. Two axes, kept apart:
 * `bookingType` is what the job is — a passenger or a package — and
 * `serviceType` is what turns up to do it. The server is authoritative; these
 * exist so a rider's screen can label an offer without a second round trip.
 */
export const BOOKING_TYPE = { RIDE: 'RIDE', PARCEL: 'PARCEL' };

export const SERVICE_LABEL = {
  BIKE: 'Bike',
  AUTO: 'Auto',
  CAR: 'Car',
  AMBULANCE: 'Ambulance',
  BIKE_PARCEL: 'Bike Parcel',
  AUTO_PARCEL: 'Auto Parcel'
};

const SERVICE_BOOKING_TYPE = {
  BIKE: BOOKING_TYPE.RIDE,
  AUTO: BOOKING_TYPE.RIDE,
  CAR: BOOKING_TYPE.RIDE,
  AMBULANCE: BOOKING_TYPE.RIDE,
  BIKE_PARCEL: BOOKING_TYPE.PARCEL,
  AUTO_PARCEL: BOOKING_TYPE.PARCEL
};

/** Null for a service this build has not heard of, so callers can fall back. */
export const bookingTypeOf = (serviceType) => SERVICE_BOOKING_TYPE[serviceType] || null;

export const ROLES = { CUSTOMER: 'customer', RIDER: 'rider' };

export const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike' },
  { value: 'auto', label: 'Auto' },
  { value: 'car', label: 'Car' }
];
