import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  Luggage,
  Mail,
  MessageSquarePlus,
  Phone,
  Route,
  UserRound
} from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Card, CardBody } from '@/components/ui/card';
import { BottomSheet, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useComplaints, useComplaintUnread } from '@/hooks/useComplaints';
import { OPEN_STATUSES } from '@/constants/complaint';
import * as settingsApi from '@/services/settings.api';
import { plural } from '@/utils/format';

/**
 * Help.
 *
 * Two halves: a way to actually reach support, and answers to the things people
 * ask that the app can answer itself. The reporting half is real now — it files
 * a complaint the support console picks up — so this screen no longer has to
 * apologise for being a dead end.
 *
 * The support phone and email are platform settings, so they appear only when an
 * admin has filled them in. Showing a blank contact card would be worse than
 * showing none.
 */
const TOPICS = [
  {
    key: 'ride',
    icon: Route,
    title: 'Problem with a ride',
    summary: 'Wrong route, long wait, ride not as expected',
    detail:
      'Open the trip from your Activity list — it has the exact route, distance and fare the server recorded, plus the rider and vehicle. That record is what any review is based on. If it still looks wrong, report it and support will look at the same record.'
  },
  {
    key: 'payment',
    icon: CreditCard,
    title: 'Payment issue',
    summary: 'Charged wrong, payment not settling',
    detail:
      'Fares are distance multiplied by the rate saved on that ride, so the trip detail screen shows exactly how the amount was reached — including the rate at the time you booked, which is what you are charged even if prices have changed since. Cash is marked paid by your rider once they confirm it.'
  },
  {
    key: 'driver',
    icon: UserRound,
    title: 'Issue with a rider',
    summary: 'Behaviour, vehicle did not match',
    detail:
      'The vehicle number shown before pickup is the one registered to that rider. If it did not match, do not start the trip — cancel and book again. Rate the trip afterwards, and report anything serious here.'
  },
  {
    key: 'lost',
    icon: Luggage,
    title: 'Lost item',
    summary: 'Something left in the vehicle',
    detail:
      'Open the trip in Activity and call the rider from there — the number stays available on completed trips. The chat also stays open for a while after drop-off. If you cannot reach them, report it and support will.'
  },
  {
    key: 'safety',
    icon: AlertTriangle,
    title: 'Safety',
    summary: 'You feel unsafe during a ride',
    detail:
      'If you are in immediate danger, call your local emergency number first — this app is not an emergency service. During a trip, the active ride screen shows your rider, their vehicle number and their live position; share that with someone you trust. A safety report here is treated as urgent.',
    tone: 'danger'
  }
];

export default function Help() {
  const [topic, setTopic] = useState(null);
  const [contact, setContact] = useState(null);

  const { complaints, loaded } = useComplaints();
  const { unread } = useComplaintUnread();

  useEffect(() => {
    let cancelled = false;

    settingsApi
      .publicSettings()
      .then((result) => !cancelled && setContact(result))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const openCount = complaints.filter((complaint) => OPEN_STATUSES.includes(complaint.status)).length;

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Help" back="/profile" />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        <Card>
          <CardBody className="p-2">
            <Link
              to="/support/new"
              className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-accent">
                <MessageSquarePlus className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-body">Report a problem</span>
                <span className="block text-[12px] text-muted">Support replies in the app</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </Link>

            <Link
              to="/support"
              className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-faint">
                <LifeBuoy className="size-[18px]" aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--accent)]" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-body">Your reports</span>
                <span className="block text-[12px] text-muted">
                  {!loaded
                    ? 'Loading…'
                    : complaints.length === 0
                      ? 'Nothing reported yet'
                      : unread > 0
                        ? `${unread} new ${unread === 1 ? 'reply' : 'replies'}`
                        : openCount > 0
                          ? `${openCount} still open`
                          : `${plural(complaints.length, 'report')}, all closed`}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </Link>
          </CardBody>
        </Card>

        {(contact?.supportPhone || contact?.supportEmail) && (
          <Card>
            <CardBody className="p-2">
              {contact.supportPhone && (
                <a
                  href={`tel:${contact.supportPhone}`}
                  className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-faint">
                    <Phone className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-body">Call support</span>
                    <span className="block text-[12px] text-muted">{contact.supportPhone}</span>
                  </span>
                </a>
              )}

              {contact.supportEmail && (
                <a
                  href={`mailto:${contact.supportEmail}`}
                  className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-faint">
                    <Mail className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-body">Email support</span>
                    <span className="block truncate text-[12px] text-muted">{contact.supportEmail}</span>
                  </span>
                </a>
              )}
            </CardBody>
          </Card>
        )}

        <h2 className="px-1 pt-2 text-[13px] font-semibold text-body">Common questions</h2>

        <Card>
          <CardBody className="p-2">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTopic(t)}
                className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <span
                  className={
                    t.tone === 'danger'
                      ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--danger-wash)] text-[var(--danger)]'
                      : 'grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-faint'
                  }
                >
                  <t.icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-body">{t.title}</span>
                  <span className="block truncate text-[12px] text-muted">{t.summary}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      <BottomSheet open={Boolean(topic)} onOpenChange={() => setTopic(null)} label={topic?.title}>
        {topic && (
          <>
            <SheetHeader title={topic.title} description={topic.summary} />
            <div className="space-y-4 px-5 pb-6 pb-safe">
              <p className="text-[14px] leading-relaxed text-muted">{topic.detail}</p>

              <Button asChild block>
                <Link to="/support/new" onClick={() => setTopic(null)}>
                  <MessageSquarePlus aria-hidden />
                  Report this
                </Link>
              </Button>

              <Button variant="ghost" block onClick={() => setTopic(null)}>
                Close
              </Button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
