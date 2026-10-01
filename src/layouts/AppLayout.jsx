import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Clock, Home, Navigation, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/constants/ride';
import { GlassSurface } from '@/components/ui/glass';
import { PageLoader } from '@/components/common/PageLoader';
import { Assistant } from '@/components/assistant/Assistant';
import { useUnreadCount } from '@/hooks/useNotifications';

const CUSTOMER_NAV = [
  { to: '/', label: 'Ride', icon: Home, end: true },
  { to: '/rides', label: 'Activity', icon: Clock },
  { to: '/notifications', label: 'Alerts', icon: Bell, badge: true },
  { to: '/profile', label: 'Profile', icon: User }
];

const RIDER_NAV = [
  { to: '/rider', label: 'Drive', icon: Navigation, end: true },
  // The money tab leads to the wallet rather than the earnings breakdown:
  // a rider who cannot go online needs the balance and the recharge button
  // first, and the breakdown is one tap further on.
  { to: '/rider/wallet', label: 'Wallet', icon: Wallet },
  { to: '/rider/rides', label: 'Trips', icon: Clock },
  { to: '/rider/profile', label: 'Profile', icon: User }
];

/**
 * A floating glass tab bar on mobile, a slim rail from `md` up. Screens that own
 * the whole viewport — live tracking, an active trip — render outside this.
 *
 * THE SHELL OUTLIVES THE ROUTE. This layout, and the tab bar inside it, stay
 * mounted across every tab change; only the content inside `<main>` is replaced.
 * Two things used to break that, and both were above this component:
 *
 *   1. a `<Suspense>` wrapping the whole `<Routes>` tree, so any lazily loaded
 *      page replaced the entire shell with a full-page loader, and
 *   2. `key={location.pathname}` on `<Routes>`, which told React the matched
 *      tree was a different tree on every navigation — remounting this layout,
 *      the tab bar and its glass filters each time.
 *
 * The boundary now lives here, around the outlet. The tab bar is a sibling of
 * `<main>` and on a higher layer, so a page can be loading, animating or
 * suspended without the navigation moving at all.
 */
export function AppLayout() {
  const { role } = useAuth();
  const unread = useUnreadCount();
  const items = role === ROLES.RIDER ? RIDER_NAV : CUSTOMER_NAV;

  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh bg-app md:flex">
      <nav
        aria-label="Main"
        className={cn(
          'fixed inset-x-3 bottom-3 z-40 pb-safe',
          'md:static md:inset-auto md:h-dvh md:w-[5.5rem] md:shrink-0 md:border-r md:bg-surface md:pt-6 md:pb-0'
        )}
      >
        <GlassSurface
          cornerRadius={26}
          blurAmount={22}
          saturation={165}
          displacementScale={6}
          mode="polar"
          className="md:hidden"
          padding="6px"
        >
          <ul className="flex items-stretch">
            {items.map((item) => (
              <NavItem key={item.to} {...item} unread={unread} />
            ))}
          </ul>
        </GlassSurface>

        <ul className="hidden md:flex md:flex-col md:gap-1">
          {items.map((item) => (
            <NavItem key={item.to} {...item} unread={unread} rail />
          ))}
        </ul>
      </nav>

      {/**
       * `relative` so the loader can cover this area and only this area.
       *
       * Layering, without arbitrary numbers: page content sits at the base, the
       * loader at z-20, the tab bar at z-40. The loader can therefore cover the
       * content it is standing in for and can never cover the navigation.
       */}
      <main className="relative min-h-0 flex-1 md:overflow-y-auto">
        {/**
         * One boundary, around the page and nothing else.
         *
         * It is inside `<main>` so the tab bar — a sibling on a higher layer —
         * is untouched while a page loads, which is the whole reason the
         * boundary was moved down here from above the router.
         *
         * The transition below is CSS, not a JS animation library. It was a
         * framer `AnimatePresence`, and on a route whose module had not been
         * fetched yet the enter animation never fired: the page rendered fully
         * and stayed at `opacity: 0` for ever — a blank screen with a working
         * page behind it. Moving the boundary out of the animation did not help,
         * because the presence bookkeeping was the part that got stuck. A
         * keyframe has no such state.
         */}
        <Suspense fallback={<PageLoader />}>
          {/**
           * Keyed on the path, so a navigation hands React a fresh node and the
           * CSS animation replays. Nothing here holds animation state, which is
           * the point — see `.page-in` in index.css for what went wrong when it
           * did.
           */}
          <div key={pathname} className="min-h-full page-in">
            <Outlet />
          </div>
        </Suspense>
      </main>

      {/**
       * The assistant sits outside `<main>`, as a sibling of the tab bar.
       *
       * Same reasoning as the navigation: it must survive a route change, and
       * it must not be inside the element that a page transition animates or a
       * Suspense boundary can replace. Its own layering is above the content
       * and above the tab bar, because while it is open it is what the person
       * is looking at.
       */}
      <Assistant />
    </div>
  );
}

function NavItem({ to, label, icon: Icon, end, badge, unread, rail = false }) {
  return (
    <li className={rail ? '' : 'flex-1'}>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'relative flex flex-col items-center gap-1 rounded-2xl py-2 text-[10.5px] font-medium transition-colors',
            rail && 'py-3',
            isActive ? 'text-accent' : 'text-faint hover:text-muted'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId={rail ? 'nav-rail' : 'nav-pill'}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-2xl bg-[var(--accent-wash)]"
              />
            )}
            <span className="relative">
              <Icon className="size-[21px]" aria-hidden />
              {badge && unread > 0 && (
                <span
                  className="absolute -right-1.5 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-semibold text-white"
                  aria-label={`${unread} unread`}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
            <span className="relative">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}
