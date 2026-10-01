import { Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequireOnboarded,
  RequireRole,
  RequireUnfinished
} from './guards';
import { route } from './pending';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import { ROLES } from '@/constants/ride';

/**
 * The customer's ride alerts, and the socket client underneath them.
 *
 * Eager, this one route element reached `useRideNotifications` ->
 * `useSocket` -> `socket.io-client`, which put 46 KB of raw socket code in the
 * entry chunk for every visitor — including one reading the About page. It sits
 * behind the customer role guard, so nobody who is not a signed-in customer can
 * ever render it.
 */
const CustomerAlerts = route(() =>
  import('./CustomerAlerts').then((m) => ({ default: m.CustomerAlerts }))
);

/**
 * The signed-in shell, loaded only by somebody who is signed in.
 *
 * It is the one eager import that put framer-motion on every visitor's critical
 * path: the tab bar's active pill is a shared-layout animation, which is a
 * genuine use of the library and not something to downgrade into a worse
 * version in CSS. But a person on the login screen has no tab bar, and was
 * downloading the engine that draws its pill before they could read the form.
 *
 * Lazy, it travels with the screens that need it, downloaded in parallel with
 * the page chunk rather than after it. The only visit that waits is the first
 * signed-in paint, which is already behind the opening cover.
 */
const AppLayout = route(() => import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })));

// Map-heavy screens are split out so the auth and history routes don't load Leaflet.
const Login = route(() => import('@/pages/auth/Login'));
const Register = route(() => import('@/pages/auth/Register'));
const ForgotPassword = route(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = route(() => import('@/pages/auth/ResetPassword'));

// Onboarding: the screens between having an account and being able to use it.
const CompleteProfile = route(() => import('@/pages/onboarding/CompleteProfile'));
const RiderOnboarding = route(() => import('@/pages/onboarding/RiderOnboarding'));
const LocationPermission = route(() => import('@/pages/onboarding/LocationPermission'));

// The only two screens anyone can read without an account. Split out like every
// other route, so a signed-in rider never downloads them.
const About = route(() => import('@/pages/public/About'));
const Contact = route(() => import('@/pages/public/Contact'));

const CustomerHome = route(() => import('@/pages/customer/Home'));
const RideTracking = route(() => import('@/pages/customer/RideTracking'));
const CustomerRides = route(() => import('@/pages/customer/Rides'));
const RideDetail = route(() => import('@/pages/customer/RideDetail'));
const CustomerProfile = route(() => import('@/pages/customer/Profile'));
const Notifications = route(() => import('@/pages/customer/Notifications'));
const SavedPlaces = route(() => import('@/pages/customer/SavedPlaces'));
const CustomerPayments = route(() => import('@/pages/customer/Payments'));
const Help = route(() => import('@/pages/customer/Help'));
const CustomerSettings = route(() => import('@/pages/settings/CustomerSettings'));
const PaymentReturn = route(() => import('@/pages/customer/PaymentReturn'));

// Support is shared: a customer and a rider file and follow reports the same way.
const MyComplaints = route(() => import('@/pages/support/MyComplaints'));
const NewComplaint = route(() => import('@/pages/support/NewComplaint'));
const ComplaintDetail = route(() => import('@/pages/support/ComplaintDetail'));

const RiderDashboard = route(() => import('@/pages/rider/Dashboard'));
const RiderActiveRide = route(() => import('@/pages/rider/ActiveRide'));
const RiderRides = route(() => import('@/pages/rider/Rides'));
const RiderProfile = route(() => import('@/pages/rider/Profile'));
const RiderEarnings = route(() => import('@/pages/rider/Earnings'));
const RiderWallet = route(() => import('@/pages/rider/Wallet'));
const RiderStatistics = route(() => import('@/pages/rider/Statistics'));
const RiderHelp = route(() => import('@/pages/rider/Help'));
const RiderSettings = route(() => import('@/pages/settings/RiderSettings'));

/**
 * The operations console, behind one lazy boundary.
 *
 * `/admin/*` is a splat so the console's own nested router owns everything
 * below it. Lazy because this is the entire console — its pages, tables,
 * charts and its own API layer — and a customer opening the app has no reason
 * to download any of it. Nothing here authorises anybody: `AdminApp` mounts the
 * console's own provider, which has no session until somebody signs in at
 * `/admin/login` against the admin endpoints, and the backend checks a
 * permission on every admin route regardless of what the browser believes.
 */
const AdminApp = route(() => import('@/admin/AdminApp'));

const NotFound = route(() => import('@/pages/NotFound'));

/**
 * The route table. Layouts own their own loading and transitions.
 *
 * Note what is NOT here any more: a `<Suspense>` around the whole tree and a
 * `key` on `<Routes>`. Together they meant every navigation threw away the
 * matched tree and replaced it with a full-page loader — which is why the tab
 * bar disappeared mid-navigation and came back when the page finished. The
 * boundary and the page transition now live inside `AppLayout`, beside the tab
 * bar rather than above it.
 *
 * The outer `<Suspense>` that remains is only a backstop for the routes with no
 * layout of their own — the auth screens, the public pages, the full-bleed
 * tracking screens. None of those has a tab bar to preserve.
 */
export function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes location={location}>
        {/**
         * Public, and behind no guard at all.
         *
         * Not `RedirectIfAuthenticated`, which would bounce a signed-in
         * person away from the About page they just tapped; not
         * `RequireAuth`, which would hand a crawler the login screen and get
         * these indexed as that. They are readable in either state, which is
         * what "public page" has to mean for the canonical to be true.
         */}
        <Route element={<PublicLayout />}>
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route element={<RedirectIfAuthenticated />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Reached from an emailed link, so it has to work for somebody who
                is signed out — which is everybody who needs it. */}
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Route>

        {/* The console. Outside every customer guard — those redirect on a
            customer session, which an operator does not have and must not
            need. */}
        <Route path="/admin/*" element={<AdminApp />} />

        <Route element={<RequireAuth />}>
          {/**
           * The screens between having an account and being able to use one.
           *
           * OUTSIDE `RequireOnboarded`, which is what makes the redirect
           * terminate: that guard sends unfinished accounts here, and if these
           * routes sat inside it they would send them here again, forever.
           * `RequireUnfinished` is the mirror — somebody with nothing left to
           * do is sent on rather than shown a form they have already filled in.
           */}
          <Route element={<RequireUnfinished />}>
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/rider/onboarding" element={<RiderOnboarding />} />
          </Route>

          {/* Asked after sign-in, never before it, and always skippable. */}
          <Route path="/location" element={<LocationPermission />} />

          {/* Customer */}
          <Route element={<RequireOnboarded />}>
          <Route element={<RequireRole role={ROLES.CUSTOMER} />}>
          {/* Ride alerts live here, above both customer layouts, so the
              listener is registered exactly once for the whole app. */}
          <Route element={<CustomerAlerts />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<CustomerHome />} />
              <Route path="/rides" element={<CustomerRides />} />
              <Route path="/rides/:rideId" element={<RideDetail />} />
              <Route path="/payments" element={<CustomerPayments />} />
              <Route path="/profile" element={<CustomerProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/saved-places" element={<SavedPlaces />} />
              <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<CustomerSettings />} />
          {/* Where the payment gateway sends the customer back to. Inside the
              customer layout because that is who returns here, and guarded like
              every other customer route — the page itself decides nothing. */}
          <Route path="/payments/return" element={<PaymentReturn />} />
              <Route path="/support" element={<MyComplaints />} />
              <Route path="/support/new" element={<NewComplaint />} />
              <Route path="/support/:complaintId" element={<ComplaintDetail />} />
            </Route>
            {/* Full-bleed: owns the viewport, no tab bar. */}
            <Route path="/ride/:rideId" element={<RideTracking />} />
          </Route>
          </Route>

          {/* Rider */}
          <Route element={<RequireRole role={ROLES.RIDER} />}>
            <Route element={<AppLayout />}>
              <Route path="/rider" element={<RiderDashboard />} />
              <Route path="/rider/wallet" element={<RiderWallet />} />
              <Route path="/rider/earnings" element={<RiderEarnings />} />
              <Route path="/rider/rides" element={<RiderRides />} />
              <Route path="/rider/statistics" element={<RiderStatistics />} />
              <Route path="/rider/profile" element={<RiderProfile />} />
              <Route path="/rider/help" element={<RiderHelp />} />
          <Route path="/rider/settings" element={<RiderSettings />} />
              <Route path="/rider/support" element={<MyComplaints />} />
              <Route path="/rider/support/new" element={<NewComplaint />} />
              <Route path="/rider/support/:complaintId" element={<ComplaintDetail />} />
            </Route>
            <Route path="/rider/ride/:rideId" element={<RiderActiveRide />} />
          </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
