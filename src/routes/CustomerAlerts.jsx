import { Outlet } from 'react-router-dom';
import { useRideNotifications } from '@/hooks/useRideNotifications';

/**
 * One home for the customer's ride alerts, above every customer screen.
 *
 * A route element rather than a component dropped into a layout, because the
 * customer app has two layouts — the tabbed one and the full-bleed tracking
 * screen — and an alert that only worked under one of them would go missing
 * exactly when the customer was watching their rider approach.
 *
 * It renders nothing. Its whole job is to be mounted once, for as long as the
 * customer is signed in, so the socket listener underneath is registered once
 * and torn down once.
 */
export function CustomerAlerts() {
  useRideNotifications();
  return <Outlet />;
}
