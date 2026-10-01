import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ConsoleLayout } from '@/admin/layouts/ConsoleLayout';
import { RedirectIfAuthenticated, RequireAuth, RequirePermission } from './guards';
import { FullPageLoader } from '@/admin/components/common/FullPageLoader';
import { PERMISSIONS as P } from '@/admin/constants/permissions';

/**
 * Every page is split out.
 *
 * An operator on the complaints queue all day should not have downloaded the
 * settings forms and the admin-management screens to get there.
 */
const Login = lazy(() => import('@/admin/pages/auth/Login'));

const Dashboard = lazy(() => import('@/admin/pages/dashboard/Dashboard'));

const Customers = lazy(() => import('@/admin/pages/customers/Customers'));
const CustomerDetail = lazy(() => import('@/admin/pages/customers/CustomerDetail'));

const Riders = lazy(() => import('@/admin/pages/riders/Riders'));
const RiderDetail = lazy(() => import('@/admin/pages/riders/RiderDetail'));

const Rides = lazy(() => import('@/admin/pages/rides/Rides'));
const RideDetail = lazy(() => import('@/admin/pages/rides/RideDetail'));
const RideChat = lazy(() => import('@/admin/pages/chat/RideChat'));

const Payments = lazy(() => import('@/admin/pages/payments/Payments'));
const PaymentDetail = lazy(() => import('@/admin/pages/payments/PaymentDetail'));

const Finance = lazy(() => import('@/admin/pages/finance/Finance'));

const Complaints = lazy(() => import('@/admin/pages/complaints/Complaints'));
const ComplaintDetail = lazy(() => import('@/admin/pages/complaints/ComplaintDetail'));

const Settings = lazy(() => import('@/admin/pages/settings/Settings'));
const Pricing = lazy(() => import('@/admin/pages/pricing/Pricing'));
const Notifications = lazy(() => import('@/admin/pages/notifications/Notifications'));
const AuditLogs = lazy(() => import('@/admin/pages/audit-logs/AuditLogs'));
const Admins = lazy(() => import('@/admin/pages/admins/Admins'));
const Profile = lazy(() => import('@/admin/pages/profile/Profile'));

const NotFound = lazy(() => import('@/admin/pages/NotFound'));

/** Wraps a page in the permission it needs, keeping the table below readable. */
const gated = (permission, Component) => (
  <RequirePermission permission={permission}>
    <Component />
  </RequirePermission>
);

/**
 * Every path here is relative, because this table is mounted under `/admin/*`
 * in the customer app's router. `login` resolves to `/admin/login` and the
 * index route to `/admin`. The one absolute path that used to be here —
 * `/login` — would have collided with the customer sign-in screen.
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="login" element={<Login />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<ConsoleLayout />}>
            <Route index element={gated(P.RIDES_READ, Dashboard)} />

            <Route path="customers" element={gated(P.USERS_READ, Customers)} />
            <Route path="customers/:userId" element={gated(P.USERS_READ, CustomerDetail)} />

            <Route path="riders" element={gated(P.RIDERS_READ, Riders)} />
            <Route path="riders/:riderId" element={gated(P.RIDERS_READ, RiderDetail)} />

            <Route path="rides" element={gated(P.RIDES_READ, Rides)} />
            <Route path="rides/:rideId" element={gated(P.RIDES_READ, RideDetail)} />
            <Route path="rides/:rideId/chat" element={gated(P.CHAT_READ, RideChat)} />

            <Route path="payments" element={gated(P.PAYMENTS_READ, Payments)} />
            <Route path="payments/:paymentId" element={gated(P.PAYMENTS_READ, PaymentDetail)} />

            <Route path="finance" element={gated(P.FINANCE_READ, Finance)} />

            <Route path="complaints" element={gated(P.COMPLAINTS_READ, Complaints)} />
            <Route path="complaints/:complaintId" element={gated(P.COMPLAINTS_READ, ComplaintDetail)} />

            <Route path="pricing" element={gated(P.SETTINGS_READ, Pricing)} />
            <Route path="settings" element={gated(P.SETTINGS_READ, Settings)} />
            <Route path="notifications" element={gated(P.NOTIFICATIONS_READ, Notifications)} />
            <Route path="audit-logs" element={gated(P.AUDIT_READ, AuditLogs)} />
            <Route path="admins" element={gated(P.ADMINS_READ, Admins)} />

            {/* Everyone signed in has a profile. */}
            <Route path="profile" element={<Profile />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
