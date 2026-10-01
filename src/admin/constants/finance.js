/**
 * The ledger's vocabulary, mirroring src/constants/finance.js on the backend.
 *
 * The convention every money screen is built on: a ledger `amount` is always a
 * positive magnitude and the sign lives in `direction`. CREDIT moves the
 * balance up, DEBIT moves it down, and MEMO records something true about the
 * money without moving the balance at all — the platform's commission and the
 * money a gateway collected are both facts about a ride that never passed
 * through the rider's hands.
 *
 * A wallet `balance` is signed, but no screen reads it: the API sends
 * `outstanding` and `available` as separate non-negative figures, and deriving
 * them again in the browser is how the two ends of the system drift apart.
 */

export const LEDGER_TYPE = {
  RIDE_EARNING: 'RIDE_EARNING',
  PLATFORM_COMMISSION: 'PLATFORM_COMMISSION',
  CASH_COLLECTION: 'CASH_COLLECTION',
  UPI_PAYMENT: 'UPI_PAYMENT',
  RIDER_RECHARGE: 'RIDER_RECHARGE',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  REFUND: 'REFUND'
};

export const LEDGER_TYPE_LABEL = {
  RIDE_EARNING: 'Ride earning',
  PLATFORM_COMMISSION: 'Platform commission',
  CASH_COLLECTION: 'Cash collected',
  UPI_PAYMENT: 'Paid by UPI',
  RIDER_RECHARGE: 'Recharge',
  ADMIN_ADJUSTMENT: 'Manual adjustment',
  REFUND: 'Refund'
};

export const LEDGER_DIRECTION = { CREDIT: 'CREDIT', DEBIT: 'DEBIT', MEMO: 'MEMO' };

export const WALLET_STATUS = { ACTIVE: 'ACTIVE', PAYMENT_REQUIRED: 'PAYMENT_REQUIRED' };

export const WALLET_STATUS_LABEL = {
  ACTIVE: 'Active',
  // Not "Blocked": a rider's *account* can be blocked too, and one word meaning
  // two things on the same screen is how support ends up unblocking the wrong
  // one. This is the wallet being over its ceiling, and it says so.
  PAYMENT_REQUIRED: 'Payment required'
};

export const WALLET_STATUS_TONE = { ACTIVE: 'success', PAYMENT_REQUIRED: 'danger' };

export const RECHARGE_STATUS_TONE = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral'
};

/** A manual adjustment is refused without one, at the edge and in the service. */
export const MIN_ADJUSTMENT_REASON = 4;
