/**
 * Statuses and their tones, matching the backend's constants.
 *
 * A tone rather than a colour: the badge component maps tone to a token, so a
 * palette change happens in one place and no screen hard-codes a colour.
 */

export const RIDE_STATUS = {
  SEARCHING: 'SEARCHING',
  ACCEPTED: 'ACCEPTED',
  ARRIVING: 'ARRIVING',
  ARRIVED: 'ARRIVED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const RIDE_STATUS_LABEL = {
  SEARCHING: 'Searching',
  ACCEPTED: 'Accepted',
  ARRIVING: 'On the way',
  ARRIVED: 'At pickup',
  OTP_VERIFIED: 'Code verified',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const RIDE_STATUS_TONE = {
  SEARCHING: 'info',
  ACCEPTED: 'accent',
  ARRIVING: 'accent',
  ARRIVED: 'warning',
  OTP_VERIFIED: 'accent',
  IN_PROGRESS: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'neutral'
};

export const ACTIVE_RIDE_STATUSES = [
  'SEARCHING',
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
  'OTP_VERIFIED',
  'IN_PROGRESS'
];

export const PAYMENT_METHOD = { CASH: 'CASH', UPI: 'UPI' };

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  INITIATED: 'INITIATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

export const PAYMENT_STATUS_TONE = {
  PENDING: 'warning',
  INITIATED: 'info',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral'
};

export const COMPLAINT_STATUS = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  WAITING_FOR_USER: 'WAITING_FOR_USER',
  WAITING_FOR_RIDER: 'WAITING_FOR_RIDER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

export const COMPLAINT_STATUS_LABEL = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  WAITING_FOR_USER: 'Waiting on customer',
  WAITING_FOR_RIDER: 'Waiting on rider',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

export const COMPLAINT_STATUS_TONE = {
  OPEN: 'warning',
  IN_REVIEW: 'accent',
  WAITING_FOR_USER: 'info',
  WAITING_FOR_RIDER: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral'
};

export const COMPLAINT_PRIORITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' };

export const PRIORITY_TONE = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger'
};

/**
 * Which statuses may follow which — the backend's own table.
 *
 * The status picker offers only reachable options, so support never submits a
 * change the server is going to refuse.
 */
export const COMPLAINT_TRANSITIONS = {
  OPEN: ['IN_REVIEW', 'WAITING_FOR_USER', 'WAITING_FOR_RIDER', 'CLOSED'],
  IN_REVIEW: ['WAITING_FOR_USER', 'WAITING_FOR_RIDER', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_USER: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_RIDER: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_REVIEW', 'CLOSED'],
  CLOSED: []
};

/** Human labels for the configurable complaint categories. */
export const CATEGORY_LABEL = {
  RIDE_ISSUE: 'Problem with a ride',
  PAYMENT_ISSUE: 'Payment issue',
  RIDER_BEHAVIOUR: 'Rider behaviour',
  CUSTOMER_BEHAVIOUR: 'Customer behaviour',
  PICKUP_ISSUE: 'Pickup issue',
  DESTINATION_ISSUE: 'Destination issue',
  FARE_ISSUE: 'Fare issue',
  LOST_ITEM: 'Lost item',
  CUSTOMER_NO_SHOW: 'Customer no-show',
  APP_ISSUE: 'App issue',
  SAFETY_ISSUE: 'Safety',
  OTHER: 'Other'
};

export const categoryLabel = (key) =>
  CATEGORY_LABEL[key] || String(key || '').replace(/_/g, ' ').toLowerCase();

/**
 * Rider verification, mirroring `backend/src/constants/riderVerification.js`.
 *
 * GRANDFATHERED is in this list because the console has to DISPLAY it — it
 * marks riders who predate verification and are allowed to work without ever
 * having been reviewed. It is deliberately absent from `VERIFICATION_SETTABLE`:
 * the server rejects an admin trying to set it, so offering the button would
 * only produce an error.
 */
export const VERIFICATION = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  GRANDFATHERED: 'GRANDFATHERED'
};

export const VERIFICATION_LABEL = {
  PENDING: 'Waiting for review',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  GRANDFATHERED: 'Approved before review existed'
};

export const VERIFICATION_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  GRANDFATHERED: 'neutral'
};

/** The statuses that let a rider go online — the same pair the server uses. */
export const VERIFICATION_CAN_WORK = [VERIFICATION.APPROVED, VERIFICATION.GRANDFATHERED];

/** What an admin may set. Excludes the migration marker. */
export const VERIFICATION_SETTABLE = [
  VERIFICATION.APPROVED,
  VERIFICATION.REJECTED,
  VERIFICATION.PENDING
];
