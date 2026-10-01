import { Link } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/card';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatMoney } from '@/utils/format';

/**
 * About Raahi.
 *
 * Every claim on this page is one the application can back up, and the service
 * list is not a written-out copy of one — it is the live catalogue from
 * `/settings`, the same source the booking screen reads. So it cannot advertise
 * a service an admin has switched off, or a price that changed last week, and
 * nobody has to remember to edit this file when the catalogue moves.
 *
 * What is deliberately absent: a founding story, a team, an office, a city
 * list, customer numbers, ratings, awards. Not one of those is something this
 * codebase knows, and inventing them to fill a page is the fake SEO content the
 * brief rules out — and the kind of claim a search engine penalises.
 */
export default function About() {
  const settings = usePlatformSettings();

  const services = [...(settings?.services || [])].sort((a, b) => a.order - b.order);
  const rides = services.filter((s) => s.bookingType === 'RIDE');
  const parcels = services.filter((s) => s.bookingType === 'PARCEL');

  return (
    <article className="flex flex-col gap-10">
      {/* One H1, naming the page. Everything below it is an H2, so the outline
          reads as a single document rather than a pile of equal headings. */}
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-body">
          About Raahi
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Raahi is a ride-booking platform for people who need to get somewhere and for the riders
          who take them. Book a bike, an auto or a car, send a parcel across town, follow the rider
          on the map as they come to you, and pay in cash or by UPI when you arrive.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-body">How a ride works</h2>
        {/* An ordered list, because the steps happen in this order. */}
        <ol className="flex flex-col gap-3">
          {[
            {
              title: 'Set where you are and where you are going',
              body: 'Pick both points on the map or search for them. The fare is quoted before you book, worked out from the distance and the rate for the service you chose.'
            },
            {
              title: 'A nearby rider takes the request',
              body: 'The request goes to riders near your pickup point. You see who accepted, their vehicle and its number plate before they reach you.'
            },
            {
              title: 'Confirm the pickup with your code',
              body: 'Each trip has a short code. Your rider enters it to start the trip, so a ride can only begin with the person who booked it.'
            },
            {
              title: 'Follow the trip, then pay',
              body: 'The map tracks the trip as it runs, and the chat stays open if you need it. At the end you pay in cash or scan a UPI code for the exact fare.'
            }
          ].map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[13px] font-semibold text-body"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[15px] font-medium text-body">{step.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/**
       * The catalogue, live.
       *
       * Rendered only once settings have arrived — an empty grid says nothing,
       * whereas a list of services that are not really offered says something
       * false.
       */}
      {rides.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-body">Rides you can book</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rides.map((service) => (
              <li key={service.serviceType}>
                <Card>
                  <CardBody className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)] text-body">
                      <ServiceIcon serviceType={service.serviceType} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-medium text-body">{service.label}</h3>
                      <p className="mt-0.5 text-[13.5px] leading-snug text-muted">
                        {service.description}
                      </p>
                      <p className="mt-1.5 text-[13px] text-faint">
                        {service.free
                          ? 'Free at the point of use'
                          : `From ${formatMoney(service.ratePerKm, service.currency)} per km`}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {parcels.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-body">Sending a parcel</h2>
          <p className="text-[14px] leading-relaxed text-muted">
            A parcel books like a ride, with one difference: you give the sender and receiver
            details instead of riding along. The rider collects the package and delivers it to the
            person you named.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {parcels.map((service) => (
              <li key={service.serviceType}>
                <Card>
                  <CardBody className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)] text-body">
                      <ServiceIcon serviceType={service.serviceType} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-medium text-body">{service.label}</h3>
                      <p className="mt-0.5 text-[13.5px] leading-snug text-muted">
                        {service.description}
                      </p>
                      <p className="mt-1.5 text-[13px] text-faint">
                        {service.free
                          ? 'Free at the point of use'
                          : `From ${formatMoney(service.ratePerKm, service.currency)} per km`}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-body">What the fare is based on</h2>
        <p className="text-[14px] leading-relaxed text-muted">
          A fare is the distance travelled multiplied by the rate for that service, with a base
          fare and a minimum applied. The rate is saved onto the trip when you book it, so the
          amount you are charged is the amount you were quoted even if prices change afterwards.
          Every completed trip keeps its own record — route, distance, rate and total — and that
          record is what any query about it is answered from.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-body">Driving with Raahi</h2>
        <p className="text-[14px] leading-relaxed text-muted">
          Riders sign up with their vehicle and licence details, go online when they want to work,
          and take the requests they choose. Earnings are recorded per trip and visible as soon as
          a trip settles, alongside what is owed on the platform commission. There are no shifts to
          book: the app is either on or off.
        </p>
        <p className="text-[14px] text-muted">
          <Link
            to="/register"
            className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
          >
            Create a rider account
          </Link>{' '}
          to get started, or{' '}
          <Link
            to="/contact"
            className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-[var(--accent)]"
          >
            contact the Raahi team
          </Link>{' '}
          if you have questions first.
        </p>
      </section>
    </article>
  );
}
