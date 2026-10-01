import { Link, Outlet } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col surface">
      {/* Decorative field that hints at movement without competing with the form. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
        <div className="absolute -top-28 left-1/2 size-80 -translate-x-1/2 rounded-full bg-[var(--accent)]/20 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col px-6 pt-safe">
        <div className="pt-8 pb-10">
          <Logo />
        </div>

        {/**
         * `<main>`, not a div.
         *
         * The sign-in screens had no main landmark at all, which is both an axe
         * failure and a real cost to anyone who navigates by landmark: there was
         * no way to jump past the logo to the form. The other two layouts
         * already mark their content region; this one was the gap.
         */}
        {/**
         * NOT animated any more, and that is the point.
         *
         * This used to fade the whole region in over 300ms while the form
         * inside it ran its own staggered entrance — two animations over the
         * same pixels, the outer one delaying the inner one's final paint.
         * Lighthouse put the landing page's largest element inside here with
         * 964ms of render delay against 11ms of server time, so the entrance
         * WAS the Largest Contentful Paint.
         *
         * Every screen under this layout animates its own children through
         * `useAuthEntrance`, so the screen still arrives with movement. What
         * went is a redundant second fade and the animation library that was
         * loaded on every visit to draw it.
         */}
        <main className="mx-auto w-full max-w-sm flex-1 pb-6">
          <Outlet />
        </main>

        {/**
         * The way to the public pages from the two screens everyone lands on.
         *
         * Both are indexable, so this is also the internal link that connects
         * them: a crawler arriving at the login page can reach About and
         * Contact from it, rather than finding them only in the sitemap.
         */}
        <nav
          aria-label="About Raahi"
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-4 pb-10 text-[13px]"
        >
          <Link to="/about" className="px-1 py-2 text-muted hover:text-body hover:underline">
            About Raahi
          </Link>
          <span aria-hidden className="text-faint">
            ·
          </span>
          <Link to="/contact" className="px-1 py-2 text-muted hover:text-body hover:underline">
            Contact
          </Link>
        </nav>
      </div>
    </div>
  );
}
