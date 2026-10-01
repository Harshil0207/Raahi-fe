/**
 * Permission names, mirroring src/constants/adminRoles.js on the backend.
 *
 * Used to decide what to render. It is not security — the backend enforces the
 * same names on every route — but showing an operator a button that will fail is
 * its own kind of bug.
 */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_BLOCK: 'users.block',
  RIDERS_READ: 'riders.read',
  RIDERS_UPDATE: 'riders.update',
  RIDERS_BLOCK: 'riders.block',
  RIDES_READ: 'rides.read',
  RIDES_MANAGE: 'rides.manage',
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_MANAGE: 'payments.manage',
  FINANCE_READ: 'finance.read',
  FINANCE_ADJUST: 'finance.adjust',
  COMPLAINTS_READ: 'complaints.read',
  COMPLAINTS_MANAGE: 'complaints.manage',
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  CHAT_READ: 'chat.read',
  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_SEND: 'notifications.send',
  AUDIT_READ: 'audit.read',
  ADMINS_READ: 'admins.read',
  ADMINS_MANAGE: 'admins.manage'
};

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  OPERATIONS: 'OPERATIONS',
  FINANCE: 'FINANCE'
};

export const ROLE_LABEL = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  OPERATIONS: 'Operations',
  FINANCE: 'Finance'
};

/** What each permission lets someone do, for the admin-management screen. */
export const PERMISSION_LABEL = {
  'users.read': 'View customers',
  'users.update': 'Edit customer details',
  'users.block': 'Block customers',
  'riders.read': 'View riders',
  'riders.update': 'Edit riders and take them offline',
  'riders.block': 'Block riders',
  'rides.read': 'View rides',
  'rides.manage': 'Cancel stuck rides',
  'payments.read': 'View payments',
  'payments.manage': 'Settle cash payments',
  'finance.read': 'View rider balances and the ledger',
  'finance.adjust': 'Change a rider’s balance by hand',
  'complaints.read': 'View complaints',
  'complaints.manage': 'Work and resolve complaints',
  'settings.read': 'View platform settings',
  'settings.update': 'Change platform settings',
  'chat.read': 'Read ride conversations',
  'notifications.read': 'View notifications',
  'notifications.send': 'Send announcements',
  'audit.read': 'Read the audit log',
  'admins.read': 'View admins',
  'admins.manage': 'Create and change admins'
};
