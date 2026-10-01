import { useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { Badge, Card, CardBody, CardHeader, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import * as paymentApi from '@/admin/services/payment.api';

/**
 * Which gateway is live, and whether it is actually usable.
 *
 * WHAT IS NOT HERE, AND WILL NOT BE. The client secret, the webhook password,
 * the access token. None of them reaches this console — the backend's
 * `describe()` returns the client id truncated to its first characters and
 * nothing else, because an operator needs to tell sandbox from production, not
 * to read a credential back. There is deliberately no screen, here or anywhere,
 * that reveals one; rotating a key is an env file and a restart.
 *
 * What it does show is the thing that actually goes wrong: a gateway with
 * half its configuration missing, or a production deployment still pointed at
 * the sandbox. Both are named in plain words rather than left to be inferred
 * from a payment that never settles.
 */
export function GatewayPanel() {
  const { data, loading, error } = useAsync(useCallback(() => paymentApi.overview(), []), []);

  if (loading && !data) return <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />;

  // A console that cannot read the gateway's configuration still has a payments
  // table worth looking at, so this stays quiet rather than taking over the page.
  if (error || !data) return null;

  const { provider, configuration, counts, online } = data;
  const missing = configuration?.missing || [];
  const live = configuration?.isProduction;

  return (
    <Card className="mb-3">
      <CardHeader
        title="Payment gateway"
        description="Set in the environment, not here. Changing a credential means an env file and a restart."
        action={
          <Badge tone={provider?.available ? 'success' : 'warning'} dot>
            {provider?.label || 'None'}
          </Badge>
        }
      />

      <CardBody className="pt-1">
        {!provider?.available && (
          <Notice tone="warning" icon={AlertTriangle}>
            {provider?.unavailableReason ||
              'No gateway is usable, so online payment is offered to nobody. Cash is unaffected.'}
          </Notice>
        )}

        {missing.length > 0 && (
          <Notice tone="warning" icon={AlertTriangle}>
            Not configured yet. Set {missing.join(', ')} in the environment and restart.
          </Notice>
        )}

        {provider?.available && !missing.length && (
          <Notice tone="success" icon={CheckCircle2}>
            Configured and accepting payments in {configuration?.mode || 'sandbox'}.
          </Notice>
        )}

        {configuration && !configuration.webhookConfigured && (
          <Notice tone="muted" icon={Info}>
            No callback credentials are set, so gateway callbacks are refused rather than trusted. Payments still
            settle — the status poll confirms them — but a callback would be faster.
          </Notice>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <DetailList>
            <DetailRow label="Provider">{provider?.label || '—'}</DetailRow>
            <DetailRow label="Environment">
              <Badge tone={live ? 'danger' : 'neutral'}>{configuration?.mode || 'n/a'}</Badge>
            </DetailRow>
            <DetailRow label="Client id" mono>
              {configuration?.clientIdHint || <span className="text-faint">Not set</span>}
            </DetailRow>
            <DetailRow label="Merchant id" mono>
              {configuration?.merchantId || <span className="text-faint">Not set</span>}
            </DetailRow>
          </DetailList>

          <DetailList>
            <DetailRow label="API host" mono>
              {configuration?.baseUrl || '—'}
            </DetailRow>
            <DetailRow label="Return address" mono>
              {configuration?.redirectUrl || <span className="text-faint">Not set</span>}
            </DetailRow>
            <DetailRow label="Checkout expires after">
              {configuration?.expireAfterSeconds ? `${configuration.expireAfterSeconds}s` : '—'}
            </DetailRow>
            <DetailRow label="Callbacks">
              {configuration?.webhookConfigured ? 'Authenticated' : 'Not configured'}
            </DetailRow>
          </DetailList>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-hair pt-3 text-[12.5px]">
          <Count label="Paid" value={counts?.success} />
          <Count label="Pending" value={counts?.pending} />
          <Count label="Failed" value={counts?.failed} />
          <Count label="Refunded" value={counts?.refunded} />
          <Count label="Online payments" value={online?.payments} />
        </div>
      </CardBody>
    </Card>
  );
}

// The same wash-and-ink pairs the badges use, so a notice and the badge above
// it agree about what "warning" looks like.
const TONES = {
  success: 'border-transparent bg-[var(--success-wash)] text-[var(--success)]',
  warning: 'border-transparent bg-[var(--warning-wash)] text-[var(--warning)]',
  muted: 'border-hair bg-sunken text-muted'
};

function Notice({ tone, icon: Icon, children }) {
  return (
    <div className={`mb-3 flex items-start gap-2.5 rounded-[var(--radius-card)] border p-3 text-[12.5px] ${TONES[tone]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

function Count({ label, value }) {
  return (
    <span className="text-muted">
      {label} <span className="tabular font-medium text-body">{value ?? 0}</span>
    </span>
  );
}
