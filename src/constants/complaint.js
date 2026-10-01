/** Complaint statuses and priorities, matching the backend's constants. */

export const COMPLAINT_STATUS = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  WAITING_FOR_USER: 'WAITING_FOR_USER',
  WAITING_FOR_RIDER: 'WAITING_FOR_RIDER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

/**
 * What the reporter is told, which is not the same as what support sees.
 *
 * "In review" rather than "IN_REVIEW", and the two waiting states both read as
 * needing a reply — which side support is waiting on is their business, not a
 * distinction the reporter has to parse.
 */
export const STATUS_LABEL = {
  OPEN: 'Received',
  IN_REVIEW: 'Being looked at',
  WAITING_FOR_USER: 'Waiting for you',
  WAITING_FOR_RIDER: 'Waiting for you',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

export const STATUS_TONE = {
  OPEN: 'warning',
  IN_REVIEW: 'accent',
  WAITING_FOR_USER: 'warning',
  WAITING_FOR_RIDER: 'warning',
  RESOLVED: 'positive',
  CLOSED: 'neutral'
};

export const OPEN_STATUSES = ['OPEN', 'IN_REVIEW', 'WAITING_FOR_USER', 'WAITING_FOR_RIDER'];

export const COMPLAINT_PRIORITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' };

/** Plain-language names for the configurable categories. */
export const CATEGORY_LABEL = {
  RIDE_ISSUE: 'Problem with a ride',
  PAYMENT_ISSUE: 'Payment issue',
  RIDER_BEHAVIOUR: 'Rider behaviour',
  CUSTOMER_BEHAVIOUR: 'Customer behaviour',
  PICKUP_ISSUE: 'Pickup issue',
  DESTINATION_ISSUE: 'Destination issue',
  FARE_ISSUE: 'Fare issue',
  LOST_ITEM: 'Lost item',
  CUSTOMER_NO_SHOW: 'Customer did not show',
  APP_ISSUE: 'Problem with the app',
  SAFETY_ISSUE: 'Safety concern',
  OTHER: 'Something else'
};

/** A one-line hint under each category, so the picker is self-explaining. */
export const CATEGORY_HINT = {
  RIDE_ISSUE: 'The route, the wait, or the trip itself',
  PAYMENT_ISSUE: 'Charged wrongly, or a payment that will not settle',
  RIDER_BEHAVIOUR: 'How your rider behaved',
  CUSTOMER_BEHAVIOUR: 'How your passenger behaved',
  PICKUP_ISSUE: 'Could not be found, or the wrong place',
  DESTINATION_ISSUE: 'Taken somewhere else, or the wrong drop-off',
  FARE_ISSUE: 'The amount does not look right',
  LOST_ITEM: 'Something left in the vehicle',
  CUSTOMER_NO_SHOW: 'You waited and nobody came',
  APP_ISSUE: 'Something in the app is broken',
  SAFETY_ISSUE: 'You felt unsafe',
  OTHER: 'Anything not covered above'
};

export const categoryLabel = (key) =>
  CATEGORY_LABEL[key] || String(key || '').replace(/_/g, ' ').toLowerCase();

export const categoryHint = (key) => CATEGORY_HINT[key] || null;

/**
 * Categories that deserve to be reported without picking a priority.
 *
 * The backend forces safety to urgent whatever is chosen, so the app does not
 * offer a priority control at all — asking someone who feels unsafe to grade
 * their own emergency is the wrong question.
 */
export const ALWAYS_URGENT = ['SAFETY_ISSUE'];
