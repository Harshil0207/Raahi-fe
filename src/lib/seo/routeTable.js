/**
 * What every route says about itself.
 *
 * ONE table, so adding a page means adding a line here rather than editing the
 * page's metadata, robots.txt and the sitemap separately and hoping the three
 * agree. The build reads this file to write robots.txt and sitemap.xml, and the
 * app reads it to set each screen's tags — so they cannot disagree.
 *
 * Deliberately free of imports. The Vite plugin that writes those files loads
 * this in plain Node, and a table of strings should not drag React into a
 * build step.
 *
 * `indexable` is the important column, and it is opt-IN. Raahi is an
 * application, not a website: apart from signing in and signing up, every
 * screen is someone's account — their trips, their wallet, their earnings,
 * their conversations. None of that belongs in a search index, so anything not
 * marked `indexable: true` is kept out, and a private screen added next month
 * is private from the day it is added rather than from the day somebody
 * remembers it.
 */

export const ROUTE_SEO = [
  // ------------------------------------------------------------------ public
  {
    path: '/about',
    indexable: true,
    title: 'About Raahi | Ride Booking Platform',
    description: 'Learn more about Raahi and our modern approach to ride booking and mobility.'
  },
  {
    path: '/contact',
    indexable: true,
    title: 'Contact Raahi',
    description: 'Get in touch with the Raahi team for support, questions, or business enquiries.'
  },
  {
    path: '/login',
    indexable: true,
    title: 'Login | Raahi',
    description: 'Log in to your Raahi account to book rides, manage trips, and access your account.'
  },
  {
    path: '/register',
    indexable: true,
    title: 'Create Your Raahi Account',
    description:
      'Create your Raahi account and start booking rides with a fast and simple ride-booking experience.'
  },

  /**
   * Account recovery: reachable without signing in, and deliberately NOT
   * indexable. They are real screens rather than public pages — one is reached
   * from an emailed link — so they need a name and a description of their own
   * without being advertised to a search engine.
   */
  {
    path: '/forgot-password',
    title: 'Reset Your Password | Raahi',
    description: 'Request a link to set a new password for your Raahi account.'
  },
  {
    path: '/reset-password',
    title: 'Choose a New Password | Raahi',
    description: 'Set a new password for your Raahi account.'
  },

  // ------------------------------------------------------------- onboarding
  {
    path: '/complete-profile',
    title: 'Complete Your Profile | Raahi',
    description: 'Finish setting up your Raahi account before booking your first ride.'
  },
  {
    path: '/rider/onboarding',
    title: 'Rider Sign-Up | Raahi',
    description: 'Add your vehicle and licence details to start taking trips with Raahi.'
  },
  {
    path: '/location',
    title: 'Share Your Location | Raahi',
    description: 'Allow location access so Raahi can find your pickup point.'
  },

  // ----------------------------------------------------------- the customer
  {
    path: '/',
    title: 'Book a Ride | Raahi',
    description: 'Book a bike, auto, car or parcel delivery and track your rider in real time.'
  },
  {
    path: '/rides',
    title: 'Your Trips | Raahi',
    description: 'Every trip you have taken with Raahi, with fares and receipts.'
  },
  {
    path: '/rides/:rideId',
    title: 'Trip Details | Raahi',
    description: 'The route, the fare and the receipt for one trip.'
  },
  {
    path: '/ride/:rideId',
    title: 'Your Ride | Raahi',
    description: 'Track your rider, share your pickup code and pay for the trip.'
  },
  {
    path: '/profile',
    title: 'Your Profile | Raahi',
    description: 'Your Raahi account details and saved information.'
  },
  {
    path: '/notifications',
    title: 'Notifications | Raahi',
    description: 'Updates about your rides, payments and account.'
  },
  {
    path: '/saved-places',
    title: 'Saved Places | Raahi',
    description: 'The addresses you book to most often, saved for one-tap pickup.'
  },
  {
    path: '/help',
    title: 'Help & Support | Raahi',
    description: 'Answers to common questions and a way to reach the Raahi team.'
  },
  {
    path: '/settings',
    title: 'Settings | Raahi',
    description: 'Theme, notifications, accessibility and privacy preferences for your account.'
  },
  {
    path: '/payments',
    title: 'Your Payments | Raahi',
    description: 'Fares you have paid, how you paid them, and their receipts.'
  },
  {
    path: '/payments/return',
    title: 'Confirming Your Payment | Raahi',
    description: 'Checking with the payment provider that your payment went through.'
  },
  {
    path: '/support',
    title: 'Your Reports | Raahi',
    description: 'Problems you have reported to Raahi, and their replies.'
  },
  {
    path: '/support/new',
    title: 'Report a Problem | Raahi',
    description: 'Tell Raahi about a problem with a trip, a payment or your account.'
  },
  {
    path: '/support/:complaintId',
    title: 'Report | Raahi',
    description: 'One report you have filed, and what has happened with it.'
  },

  // -------------------------------------------------------------- the rider
  {
    path: '/rider',
    title: 'Rider Dashboard | Raahi',
    description: 'Go online, take ride requests and see what you have earned today.'
  },
  {
    path: '/rider/ride/:rideId',
    title: 'Active Ride | Raahi',
    description: 'Navigate to the pickup, verify the code and complete the trip.'
  },
  {
    path: '/rider/wallet',
    title: 'Wallet | Raahi',
    description: 'Your platform balance, recharges and what you owe.'
  },
  {
    path: '/rider/settings',
    title: 'Rider Settings | Raahi',
    description: 'Alerts, navigation and account preferences for driving with Raahi.'
  },
  {
    path: '/rider/earnings',
    title: 'Earnings | Raahi',
    description: 'What you have earned, by day, week and service.'
  },
  /**
   * The rider's copies of four customer screens say "Rider" rather than
   * repeating the customer title.
   *
   * Not for search — every one of these is `noindex` — but because a title is
   * also what the browser tab, the history list and the back-button menu show.
   * Two entries both reading "Your Trips | Raahi" is a rider trying to find
   * their way back to the right one of two identical rows.
   */
  {
    path: '/rider/rides',
    title: 'Rider Trips | Raahi',
    description: 'Every trip you have driven, with the fare and your share of it.'
  },
  {
    path: '/rider/statistics',
    title: 'Statistics | Raahi',
    description: 'Acceptance, cancellations and ratings over time.'
  },
  {
    path: '/rider/profile',
    title: 'Rider Profile | Raahi',
    description: 'Your rider account, vehicle and licence details.'
  },
  {
    path: '/rider/help',
    title: 'Rider Help | Raahi',
    description: 'Answers for riders, and a way to reach Raahi support.'
  },
  {
    path: '/rider/support',
    title: 'Rider Reports | Raahi',
    description: 'Problems you have reported while driving, and their replies.'
  },
  {
    path: '/rider/support/new',
    title: 'New Rider Report | Raahi',
    description: 'Tell Raahi about a problem with a trip, a fare or your account.'
  },
  {
    path: '/rider/support/:complaintId',
    title: 'Rider Report | Raahi',
    description: 'One report you have filed, and what has happened with it.'
  }
];

/** What an unrecognised path gets: a name, and no invitation to index it. */
export const FALLBACK_SEO = {
  path: '*',
  indexable: false,
  title: 'Page Not Found | Raahi',
  description: 'That page does not exist. Head back to Raahi to book your next ride.'
};

/**
 * The routes a crawler should be told about: public, and with a fixed address.
 *
 * A pattern carrying a parameter is excluded even if it were marked indexable,
 * because there is no single URL to advertise for it.
 */
export const INDEXABLE_ROUTES = ROUTE_SEO.filter((r) => r.indexable && !r.path.includes(':'));

/**
 * The private top-level prefixes, for robots.txt.
 *
 * Derived rather than typed out, so the disallow list cannot fall behind the
 * table. `/` is excluded because disallowing it would block the whole site;
 * the customer home is kept out of the index by its `noindex` tag instead,
 * which is the correct tool — `Disallow` stops a crawler reading the page and
 * therefore stops it ever seeing that tag.
 */
export const DISALLOWED_PREFIXES = [
  ...new Set([
    ...ROUTE_SEO.filter((r) => !r.indexable)
      .map((r) => r.path.split('/').filter(Boolean)[0])
      .filter(Boolean)
      .map((segment) => `/${segment}`),
    /**
     * The operations console is a separate application on its own origin, and
     * it serves its own `Disallow: /` — so this line is not what protects it.
     * It is here for the deployment that puts the console behind the same host
     * at /admin, which is a common way to run it and would otherwise leave the
     * console covered by this file's `Allow: /`.
     */
    '/admin'
  ])
].sort();
