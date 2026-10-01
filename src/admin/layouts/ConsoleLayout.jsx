import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MARK_VIEWBOX, WHEEL_SHAPES } from '@/constants/brandMark';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserCog,
  X
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/admin/components/ui/button';
import { Badge, LiveDot } from '@/admin/components/ui/misc';
import { useAuth } from '@/admin/hooks/useAuth';
import { useComplaintCounts } from '@/admin/hooks/useComplaintCounts';
import { useMaintenanceFlag } from '@/admin/hooks/useMaintenanceFlag';
import { visibleSections } from '@/admin/components/navigation/nav-items';
import { Assistant } from '@/admin/components/assistant/Assistant';
import { ROLE_LABEL } from '@/admin/constants/permissions';
import { initialsOf } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

const THEME_KEY = 'raahi.admin.theme';

/**
 * The console shell.
 *
 * Desktop-first: a permanent sidebar, a thin header, and the page filling the
 * rest. On a tablet or phone the sidebar becomes a drawer, because a 240px rail
 * on a 390px screen leaves no room for the work.
 */
export function ConsoleLayout() {
  const { admin, signOut, can } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sections = visibleSections(can);
  const counts = useComplaintCounts();
  const maintenance = useMaintenanceFlag();

  // Navigating closes the drawer; leaving it open over the new page is jarring.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-dvh bg-app">
      {/* Desktop rail */}
      <aside className="hidden w-[15rem] shrink-0 flex-col border-r border-hair bg-surface lg:flex">
        <Brand />
        <Nav sections={sections} counts={counts} />
        <SidebarFooter admin={admin} onSignOut={signOut} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[16rem] flex-col border-r border-hair bg-surface lg:hidden"
            >
              <div className="flex items-center justify-between pr-2">
                <Brand />
                <Button variant="ghost" size="icon-sm" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                  <X aria-hidden />
                </Button>
              </div>
              <Nav sections={sections} counts={counts} />
              <SidebarFooter admin={admin} onSignOut={signOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenDrawer={() => setDrawerOpen(true)} />

        {maintenance && <MaintenanceBanner />}

        <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-5">
          <Outlet />
        </main>
      </div>

      {/* Outside `<main>`, so a route change cannot unmount it mid-question. */}
      <Assistant />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      {/**
        * The platform's actual mark.
        *
        * This used to be a glyph of its own — a leaf shape unrelated to
        * anything a customer ever sees — so the console and the app were
        * branded as two different products. The paths come from the shared
        * module, which a parity check keeps identical in both apps.
        */}
      <svg viewBox={MARK_VIEWBOX} className="size-7 shrink-0" role="img" aria-label="Raahi">
        {WHEEL_SHAPES.map((shape, i) => (
          <path key={i} d={shape.d} fill={shape.fill} fillRule={shape.evenodd ? 'evenodd' : undefined} />
        ))}
      </svg>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-body">Raahi</p>
        <p className="text-[11px] leading-tight text-faint">Operations</p>
      </div>
    </div>
  );
}

function Nav({ sections, counts }) {
  return (
    <nav aria-label="Console" className="flex-1 overflow-y-auto px-2 py-2">
      {sections.map((section, index) => (
        <div key={section.label || `section-${index}`} className={cn(index > 0 && 'mt-4')}>
          {section.label && (
            <p className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
              {section.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-[var(--radius-field)] px-2 py-1.5 text-[13.5px] transition-colors',
                      isActive
                        ? 'bg-[var(--accent-wash)] font-medium text-accent'
                        : 'text-muted hover:bg-[var(--surface-hover)] hover:text-body'
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge === 'complaints' && counts?.OPEN_ANY > 0 && (
                    <span
                      className={cn(
                        'tabular rounded-full px-1.5 text-[11px] font-medium',
                        counts.URGENT > 0
                          ? 'bg-[var(--danger)] text-white'
                          : 'bg-[var(--surface-hover)] text-muted'
                      )}
                    >
                      {counts.OPEN_ANY}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ admin, onSignOut }) {
  return (
    <div className="border-t border-hair p-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-field)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-[11.5px] font-semibold text-muted">
              {initialsOf(admin?.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-body">{admin?.name}</span>
              <span className="block truncate text-[11px] text-faint">
                {ROLE_LABEL[admin?.role] || admin?.role}
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-faint" aria-hidden />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-[12rem] rounded-[var(--radius-card)] border border-hair bg-elevated p-1 shadow-[var(--shadow-float)]"
          >
            <DropdownMenu.Item asChild>
              <NavLink
                to="/admin/profile"
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-field)] px-2 py-1.5 text-[13px] text-body outline-none transition-colors data-[highlighted]:bg-[var(--surface-hover)]"
              >
                <UserCog className="size-4 text-muted" aria-hidden />
                Your profile
              </NavLink>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />

            <DropdownMenu.Item
              onSelect={onSignOut}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-field)] px-2 py-1.5 text-[13px] text-[var(--danger)] outline-none transition-colors data-[highlighted]:bg-[var(--danger-wash)]"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function Header({ onOpenDrawer }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // Cosmetic; not worth telling anyone it failed to save.
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-surface px-4 md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={onOpenDrawer}>
        <Menu aria-hidden />
      </Button>

      <div className="flex-1" />

      <span className="hidden items-center gap-1.5 text-[12px] text-muted sm:flex">
        <LiveDot />
        Live
      </span>

      <Button variant="ghost" size="icon" className="md:size-7 md:[&_svg]:size-3.5" aria-label="Toggle theme" onClick={toggleTheme}>
        {dark ? <Moon aria-hidden /> : <Sun aria-hidden />}
      </Button>
    </header>
  );
}

/**
 * Maintenance mode is the one setting whose effect is invisible from inside the
 * console — the admin keeps working while customers cannot book — so it says so.
 */
function MaintenanceBanner() {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--warning-wash)] bg-[var(--warning-wash)] px-4 py-2 text-[12.5px] md:px-6">
      <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" aria-hidden />
      <p className="text-body">
        <strong className="font-semibold">Maintenance mode is on.</strong> Customers and riders cannot start new
        rides.
      </p>
      <Badge tone="warning" className="ml-auto hidden sm:inline-flex">
        Platform paused
      </Badge>
    </div>
  );
}

export { THEME_KEY };
