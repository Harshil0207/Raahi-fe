import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  UserRound,
  Wallet
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
 * Help, for riders.
 *
 * A separate screen from the customer's because the questions are different — a
 * rider asks about earnings and no-shows, not about lost items — but the
 * reporting flow underneath is the same one.
 */
const TOPICS = [
  {
    key: 'earnings',
    icon: Wallet,
    title: 'My earnings look wrong',
    summary: 'A trip missing, or a total that does not add up',
    detail:
      'Earnings are worked out from completed trips only, at the rate each trip was booked at — so a fare change does not move an older trip. Open Earnings and tap a trip to see its distance and rate. A cancelled trip earns nothing, and a cash trip your passenger has not confirmed shows as unsettled.'
  },
  {
    key: 'payment',
    icon: CreditCard,
    title: 'A passenger has not paid',
    summary: 'Cash not handed over, or a payment stuck as pending',
    detail:
      'For cash, you confirm the payment in the app once the money is in your hand — until you do, the trip stays unsettled and counts in your pending total. If you were not paid at all, report it here with the trip attached and support will follow it up.'
  },
  {
    key: 'noshow',
    icon: UserRound,
    title: 'Passenger did not show up',
    summary: 'You waited and nobody came',
    detail:
      'Message them from the trip screen first — the chat opens as soon as you accept. If they still do not appear, cancel the trip and report it, so the cancellation is not counted against you.'
  },
  {
    key: 'requests',
    icon: MapPin,
    title: 'I am not getting ride requests',
    summary: 'Online but nothing comes through',
    detail:
      'Three things have to be true: you are online, you are not already on a trip, and your app has sent a recent position. Check the Drive screen — it says which of those is missing. Requests also only reach riders within the platform’s matching radius of a pickup.'
  },
  {
    key: 'safety',
    icon: AlertTriangle,
    title: 'Safety',
    summary: 'You feel unsafe on a trip',
    detail:
      'If you are in immediate danger, call your local emergency number first — this app is not an emergency service. A safety report here is treated as urgent and goes to the top of the support queue.',
    tone: 'danger'
  }
];

export default function RiderHelp() {
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
      <AppBar title="Help" back="/rider/profile" />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        <Card>
          <CardBody className="p-2">
            <Link
              to="/rider/support/new"
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
              to="/rider/support"
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
                <Link to="/rider/support/new" onClick={() => setTopic(null)}>
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
