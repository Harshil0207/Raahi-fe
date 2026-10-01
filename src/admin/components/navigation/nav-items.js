import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Route,
  ScrollText,
  Settings,
  Tags,
  ShieldCheck,
  UserRound,
  Users,
  Wallet
} from 'lucide-react';
import { PERMISSIONS as P } from '@/admin/constants/permissions';

/**
 * The console's navigation, grouped the way an operator's day is.
 *
 * Each item names the permission that reveals it. Hiding an item is a courtesy —
 * the backend refuses the request either way — but a sidebar full of pages that
 * 403 is worse than a short one.
 */
export const NAV_SECTIONS = [
  {
    label: null,
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: P.RIDES_READ, end: true }]
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/rides', label: 'Rides', icon: Route, permission: P.RIDES_READ },
      { to: '/admin/customers', label: 'Customers', icon: Users, permission: P.USERS_READ },
      { to: '/admin/riders', label: 'Riders', icon: UserRound, permission: P.RIDERS_READ }
    ]
  },
  {
    label: 'Money',
    items: [
      { to: '/admin/payments', label: 'Payments', icon: CreditCard, permission: P.PAYMENTS_READ },
      { to: '/admin/finance', label: 'Finance', icon: Wallet, permission: P.FINANCE_READ }
    ]
  },
  {
    label: 'Support',
    items: [
      { to: '/admin/complaints', label: 'Complaints', icon: LifeBuoy, permission: P.COMPLAINTS_READ, badge: 'complaints' },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell, permission: P.NOTIFICATIONS_READ }
    ]
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin/pricing', label: 'Pricing & services', icon: Tags, permission: P.SETTINGS_READ },
      { to: '/admin/settings', label: 'Settings', icon: Settings, permission: P.SETTINGS_READ },
      { to: '/admin/admins', label: 'Admins', icon: ShieldCheck, permission: P.ADMINS_READ },
      { to: '/admin/audit-logs', label: 'Audit log', icon: ScrollText, permission: P.AUDIT_READ }
    ]
  }
];

/** The sections this admin can see anything in, with the rest dropped entirely. */
export function visibleSections(can) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(item.permission))
  })).filter((section) => section.items.length > 0);
}
