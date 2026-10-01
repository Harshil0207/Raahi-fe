import { Link, NavLink, Outlet } from 'react-router-dom';
import { BRAND } from '@/lib/seo/site';
import { Logo } from '@/components/common/Logo';
import { cn } from '@/lib/utils';

/**
 * The frame around the pages anyone can read.
 *
 * Raahi is an application, so almost every screen is somebody's account and
 * sits behind `RequireAuth`. These few pages are the exception: they are the
 * ones a search engine, a shared link or a person deciding whether to sign up
 * ever sees, so they need a header and a footer of their own rather than the
 * signed-in tab bar.
 *
 * Deliberately outside every guard. A page that redirects a signed-out visitor
 * to the login screen is a page a crawler indexes as the login screen, and a
 * page that redirects a signed-IN visitor is one nobody can read once they have
 * an account. Both are wrong, so this layout is reachable in either state.
 *
 * The header and footer are also the internal linking: each public page is one
 * tap from the others and from signing in, which is the structure a crawler
 * follows and the structure a person uses.
 */
const NAV = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' }
];

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      {/* `<header>`, `<nav>`, `<main>` and `<footer>` rather than a stack of
          divs: the landmarks are what a screen reader navigates by, and what a
          crawler reads the page's shape from. */}
      {/* `bg-app` is a hand-written utility, not a Tailwind colour, so `/85`
          had no colour to modify and Tailwind dropped the class outright —
          leaving this bar fully transparent with content scrolling under it.
          The translucency is mixed here instead. */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_85%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 pt-safe">
          {/* The wordmark is the way home, which is what people expect of it. */}
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
            aria-label={`${BRAND.name} home`}
          >
            <Logo />
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2',
                    isActive
                      ? 'bg-[var(--surface-elevated)] text-body'
                      : 'text-muted hover:text-body'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              to="/login"
              className="ml-1 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[13.5px] font-semibold text-[var(--accent-contrast)] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-safe">
          <div>
            <Logo />
            <p className="mt-2 text-[13px] text-muted">{BRAND.tagline}</p>
          </div>

          {/**
           * Link text says where it goes. "Click here" tells a crawler and a
           * screen-reader user nothing about the destination.
           *
           * `py-2` is not decoration: these are standalone navigation links, so
           * they need a hit area a thumb can find. A link sitting inline in a
           * sentence is the documented exception and is left alone — padding
           * one of those would break the line it sits in.
           */}
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 text-[13.5px]">
            <Link to="/about" className="py-2 text-muted hover:text-body hover:underline">
              About Raahi
            </Link>
            <Link to="/contact" className="py-2 text-muted hover:text-body hover:underline">
              Contact Raahi
            </Link>
            <Link to="/login" className="py-2 text-muted hover:text-body hover:underline">
              Sign in to your account
            </Link>
            <Link to="/register" className="py-2 text-muted hover:text-body hover:underline">
              Create an account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
