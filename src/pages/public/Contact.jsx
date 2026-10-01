import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { usePlatformSettingsState } from '@/hooks/usePlatformSettings';
import { BRAND } from '@/lib/seo/site';

/**
 * Contact Raahi.
 *
 * The phone number and email are platform settings, so this page shows what an
 * admin has actually filled in and nothing when they have not. That is the
 * whole design: a contact page is the one page where an invented detail does
 * real damage — someone dials it — so there is no placeholder address, no
 * `info@`, no fake switchboard. If the settings are empty the page says how to
 * reach support from inside the app instead, which always works.
 *
 * Business enquiries go to the same address rather than a second invented one.
 */
export default function Contact() {
  const { settings, settled } = usePlatformSettingsState();

  const email = settings?.supportEmail || null;
  const phone = settings?.supportPhone || null;
  const hasDirect = Boolean(email || phone);

  /**
   * The space is held while the answer is on its way.
   *
   * The support details come from `/settings`, so this section did not exist on
   * the first paint and then appeared — above everything else on the page,
   * pushing all of it down. Measured on this route: a cumulative layout shift
   * of 0.215, against a 0.1 threshold, and the only route in the app with any
   * shift at all.
   *
   * Two placeholder cards of the same shape hold the space until the request
   * settles. They are `aria-hidden` and carry no text, so nothing is announced
   * and nothing is readable — they exist purely to stop the page moving under
   * somebody's thumb. `settled` rather than `settings === null` is what clears
   * them, so a failed request releases the space instead of reserving it for
   * ever.
   */
  const reserving = !settled;

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-body">
          Contact Raahi
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Questions about a trip, a payment or your account, and enquiries about working with{' '}
          {BRAND.name} — this is where to start.
        </p>
      </header>

      {(reserving || hasDirect) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-body">Reach the team</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {reserving &&
              [0, 1].map((i) => (
                <li key={`placeholder-${i}`} aria-hidden>
                  {/* The same skeleton as a real card, line for line, so the
                      swap changes nothing about the height. */}
                  <Card>
                    <CardBody className="flex items-start gap-3">
                      <span className="mt-0.5 size-9 shrink-0 rounded-xl bg-[var(--surface-elevated)]" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-medium text-body">&nbsp;</h3>
                        <span className="mt-0.5 block py-1.5 text-[14px]">&nbsp;</span>
                        <p className="mt-1 text-[13px]">&nbsp;</p>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ))}

            {email && (
              <li>
                {/* A real `mailto:`, and the address is the link text — so what
                    it does is obvious before it is tapped. */}
                <Card>
                  <CardBody className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)] text-body">
                      <Mail className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-medium text-body">Email</h3>
                      {/* `py-1.5` so the address is a target a thumb can hit,
                          not a 19px line of text. It is the point of the page. */}
                      <a
                        href={`mailto:${email}`}
                        className="mt-0.5 block break-words py-1.5 text-[14px] text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
                      >
                        {email}
                      </a>
                      <p className="mt-1 text-[13px] text-faint">
                        Best for anything with a trip or a receipt attached to it.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </li>
            )}

            {phone && (
              <li>
                <Card>
                  <CardBody className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)] text-body">
                      <Phone className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-medium text-body">Phone</h3>
                      <a
                        href={`tel:${phone.replace(/\s+/g, '')}`}
                        className="mt-0.5 block py-1.5 text-[14px] text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
                      >
                        {phone}
                      </a>
                      <p className="mt-1 text-[13px] text-faint">
                        Best when something is happening right now.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-body">
          Reporting a problem with a trip
        </h2>
        <p className="text-[14px] leading-relaxed text-muted">
          Anything tied to a specific trip is faster to raise from inside the app, because the
          report arrives with that trip's record attached — the route, the distance, the fare and
          the rider. Open Help from your account, choose the trip, and describe what happened. You
          can follow the reply in the same place.
        </p>
        <p className="text-[14px] text-muted">
          <Link
            to="/login"
            className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
          >
            Sign in to report a problem
          </Link>
          , or{' '}
          <Link
            to="/register"
            className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
          >
            create an account
          </Link>{' '}
          if you do not have one yet.
        </p>
      </section>

      {!hasDirect && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-body">Other enquiries</h2>
          <p className="text-[14px] leading-relaxed text-muted">
            A published support address and phone number are not configured for this deployment
            yet. Until they are, the in-app report above is the route that reaches the team, and it
            is the one that carries the most context.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-body">
          Before you get in touch
        </h2>
        <p className="text-[14px] leading-relaxed text-muted">
          <Link
            to="/about"
            className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
          >
            How Raahi works
          </Link>{' '}
          covers the questions that come up most often — how a fare is worked out, what the pickup
          code is for, and how paying by cash or UPI differs.
        </p>
      </section>
    </article>
  );
}
