// Mirrors src/constants/socketEvents.js on the backend.
export const SOCKET_EVENTS = {
  RIDE_NEW: 'ride:new',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_REJECTED: 'ride:rejected',
  RIDE_EXPIRED: 'ride:expired',
  RIDE_NO_RIDERS: 'ride:no_riders',
  RIDE_ARRIVING: 'ride:arriving',
  RIDE_RIDER_NEARBY: 'ride:rider_nearby',
  RIDE_ARRIVED: 'ride:arrived',
  RIDE_STARTED: 'ride:started',
  RIDE_AWAITING_PAYMENT: 'ride:awaiting_payment',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  RIDER_LOCATION: 'rider:location',
  LOCATION_UPDATE: 'location:update',
  PAYMENT_UPDATED: 'payment:updated',
  // The rider's balance moved. Sent to the rider alone.
  WALLET_UPDATED: 'wallet:updated',
  NOTIFICATION_NEW: 'notification:new',

  // Ride chat. JOIN/LEAVE/SEND/READ are sent; NEW/TYPING/CLOSED are received.
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_SEND: 'chat:message',
  CHAT_NEW: 'chat:message:new',
  CHAT_TYPING: 'chat:typing',
  CHAT_READ: 'chat:read',
  CHAT_CLOSED: 'chat:closed',

  COMPLAINT_MESSAGE: 'complaint:message'
};

// Emitted by the client.
export const CLIENT_EVENTS = {
  RIDE_JOIN: 'ride:join',
  RIDE_LEAVE: 'ride:leave',
  LOCATION_UPDATE: 'location:update'
};
