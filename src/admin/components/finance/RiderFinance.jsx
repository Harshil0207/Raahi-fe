import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Info, ListChecks, SlidersHorizontal, Wallet } from 'lucide-react';
import { ConfirmDialog, Modal } from '@/admin/components/common/Dialog';
import { LedgerList } from '@/admin/components/finance/LedgerList';
import { Figure } from '@/admin/components/finance/Figure';
import { MetricTile } from '@/admin/components/dashboard/MetricTile';
import { Pagination } from '@/admin/components/tables/DataTable';
import { Button } from '@/admin/components/ui/button';
import { Field, Input, Select, Textarea } from '@/admin/components/ui/input';
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as financeApi from '@/admin/services/finance.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import {
  LEDGER_DIRECTION,
  LEDGER_TYPE,
  LEDGER_TYPE_LABEL,
  MIN_ADJUSTMENT_REASON,
  RECHARGE_STATUS_TONE,
  WALLET_STATUS_LABEL,
  WALLET_STATUS_TONE
} from '@/admin/constants/finance';
import { formatDateTime, formatMoney, formatRelative, humanise } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

const LEDGER_LIMIT = 20;

/**
 * An identifier for one submission of the adjustment form.
 *
 * `randomUUID` needs a secure context, which an admin console served over
 * anything but HTTPS or localhost is not, so there is a fallback. Uniqueness
 * only has to hold per rider, and the server scopes it that way.
 */
const newKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/**
 * One rider's money: what they can be paid, what they owe, and every movement
 * behind both figures.
 *
 * `available` and `outstanding` come from the API as separate non-negative
 * numbers and are used as given. The wallet also carries a signed balance, but
 * splitting it here would put the sign convention in two places and eventually
 * in two states.
 */
export function RiderFinance({ riderId }) {
  const { can } = useAuth();
  const adjustable = can(PERMISSIONS.FINANCE_ADJUST);

  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const finance = useAsync(
    useCallback(() => financeApi.riderFinance(riderId), [riderId]),
    [riderId]
  );

  const ledger = useAsync(
    useCallback(
      () => financeApi.riderLedger(riderId, { page, limit: LEDGER_LIMIT, ...(type ? { type } : {}) }),
      [riderId, page, type]
    ),
    [riderId, page, type]
  );

  /**
   * The finance queue links straight here, so the anchor has to do more than
   * exist — nothing scrolls to a hash on a page whose content arrived after the
   * navigation did.
   */
  const anchor = useRef(null);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#finance') anchor.current?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const refresh = () => {
    finance.refetch();
    ledger.refetch();
  };

  const wallet = finance.data?.wallet;
  const currency = wallet?.currency || 'INR';
  const money = (value) => formatMoney(value, currency);
  const recharges = finance.data?.recharges?.recharges || [];

  return (
    <section id="finance" ref={anchor} aria-labelledby="finance-heading" className="mt-4 scroll-mt-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="finance-heading" className="text-[13px] font-semibold text-body">
            Financial overview
          </h2>
          {wallet && (
            <Badge tone={WALLET_STATUS_TONE[wallet.status]} dot>
              {WALLET_STATUS_LABEL[wallet.status] || humanise(wallet.status)}
            </Badge>
          )}
        </div>

        {adjustable && wallet && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setReconciling(true)}>
              <ListChecks aria-hidden />
              Recheck against ledger
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAdjusting(true)}>
              <SlidersHorizontal aria-hidden />
              Adjust balance
            </Button>
          </div>
        )}
      </div>

      {finance.error ? (
        <Card>
          <ErrorState description={finance.error.message} onRetry={finance.refetch} />
        </Card>
      ) : !wallet ? (
        <Skeleton className="h-56 w-full rounded-[var(--radius-card)]" />
      ) : (
        <>
          {!wallet.canGoOnline && (
            <Notice tone="danger" icon={AlertTriangle}>
              This rider cannot go online. They owe <Amount>{money(wallet.outstanding)}</Amount> against a ceiling of{' '}
              <Amount>{money(wallet.threshold)}</Amount>, and need to recharge{' '}
              <Amount>{money(wallet.requiredRecharge)}</Amount> to clear it. A trip already in progress is never
              interrupted by this.
            </Notice>
          )}

          {wallet.canGoOnline && wallet.nearingLimit && (
            <Notice tone="warning" icon={AlertTriangle}>
              Owes <Amount>{money(wallet.outstanding)}</Amount> against a ceiling of{' '}
              <Amount>{money(wallet.threshold)}</Amount>. The rider is warned at{' '}
              <Amount>{money(wallet.warnAt)}</Amount>, so being taken off the road is never the first they hear of it.
            </Notice>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile
              label="Available earnings"
              value={money(wallet.available)}
              hint="What the platform owes this rider"
            />
            <MetricTile
              label="Outstanding"
              value={money(wallet.outstanding)}
              tone={wallet.outstanding > 0 ? 'danger' : undefined}
              hint="What this rider owes the platform"
            />
            <MetricTile
              label="Ceiling"
              value={money(wallet.threshold)}
              hint={`Blocked above this · minimum recharge ${money(wallet.minimumRecharge)}`}
            />
          </div>

          <Card className="mt-3">
            <CardHeader
              title="Lifetime"
              description="Every ride, collection and recharge since this rider joined"
              action={
                wallet.lastEntryAt ? (
                  <span className="text-[12px] text-muted">last movement {formatRelative(wallet.lastEntryAt)}</span>
                ) : null
              }
            />
            <CardBody className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Figure label="Earnings" value={money(wallet.lifetime?.earnings)} />
              <Figure label="Platform commission" value={money(wallet.lifetime?.commission)} />
              <Figure label="Cash collected" value={money(wallet.lifetime?.cashCollected)} />
              <Figure label="UPI collected" value={money(wallet.lifetime?.upiCollected)} />
              <Figure label="Recharged" value={money(wallet.lifetime?.recharged)} />
              <Figure label="Manual adjustments" value={money(wallet.lifetime?.adjustments)} />
            </CardBody>
          </Card>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1.4fr]">
            <Card className="overflow-hidden">
              <CardHeader
                title="Recent recharges"
                description="Money this rider paid in to clear what they owe"
                action={
                  finance.data?.recharges?.total ? (
                    <span className="tabular shrink-0 text-[12px] text-muted">
                      {finance.data.recharges.total} in all
                    </span>
                  ) : null
                }
              />
              {recharges.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {recharges.map((recharge) => (
                    <li key={recharge.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="tabular text-[13px] font-medium text-body">
                          {formatMoney(recharge.amount, recharge.currency || currency)}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted">
                          {formatDateTime(recharge.settledAt || recharge.createdAt)}
                        </p>
                        {recharge.failureReason && (
                          <p className="mt-1 text-[12px] text-muted">{recharge.failureReason}</p>
                        )}
                      </div>
                      <Badge tone={RECHARGE_STATUS_TONE[recharge.status] || 'neutral'} className="shrink-0">
                        {humanise(recharge.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Wallet}
                  title="No recharges recorded"
                  description="This rider has never paid money in."
                />
              )}
            </Card>

            <Card className="overflow-hidden">
              <CardHeader
                title="Ledger"
                description="A memo row records a fact about a ride — commission, or money a gateway took — and moves no balance."
                action={
                  <Select
                    value={type}
                    onChange={(event) => {
                      setType(event.target.value);
                      setPage(1);
                    }}
                    className="w-auto min-w-[9rem]"
                    aria-label="Entry type"
                  >
                    <option value="">All entries</option>
                    {Object.values(LEDGER_TYPE).map((value) => (
                      <option key={value} value={value}>
                        {LEDGER_TYPE_LABEL[value]}
                      </option>
                    ))}
                  </Select>
                }
              />

              {ledger.error ? (
                <ErrorState description={ledger.error.message} onRetry={ledger.refetch} />
              ) : (
                <>
                  <LedgerList
                    entries={ledger.data?.entries}
                    currency={currency}
                    loading={ledger.loading}
                    empty={{
                      title: type ? 'No entries of this kind' : 'No ledger entries',
                      description: type
                        ? 'Try clearing the filter.'
                        : 'Nothing has moved through this wallet yet.'
                    }}
                  />
                  <Pagination
                    page={page}
                    limit={ledger.data?.limit || LEDGER_LIMIT}
                    total={ledger.data?.total || 0}
                    onPage={setPage}
                  />
                </>
              )}
            </Card>
          </div>
        </>
      )}

      {adjustable && wallet && (
        <>
          <AdjustBalanceDialog
            open={adjusting}
            onOpenChange={setAdjusting}
            riderId={riderId}
            name={finance.data?.rider?.name}
            currency={currency}
            onDone={refresh}
          />

          <ConfirmDialog
            open={reconciling}
            onOpenChange={setReconciling}
            title="Recheck this wallet against its ledger"
            confirmLabel="Run the check"
            description="Recomputes the balance from every entry in this rider's ledger and repairs it if the two have drifted apart. Nothing is charged and nothing is paid out. The check is recorded in the audit log either way, because “we looked and it was fine” is worth as much in a financial trail as finding a problem."
            onConfirm={async () => {
              const result = await financeApi.reconcile(riderId);
              toast.success(
                result.drift === 0
                  ? `No drift. The balance matches all ${result.entries} ledger ${
                      result.entries === 1 ? 'entry' : 'entries'
                    }.`
                  : `Drift of ${money(result.drift)} repaired — the balance moved from ${money(
                      result.before
                    )} to ${money(result.after)}.`
              );
              refresh();
            }}
          />
        </>
      )}
    </section>
  );
}

const Amount = ({ children }) => <span className="tabular font-medium">{children}</span>;

function Notice({ tone, icon: Icon, children }) {
  return (
    <div
      className={cn(
        'mb-3 flex items-start gap-2.5 rounded-[var(--radius-card)] border p-3 text-[12.5px] text-body',
        tone === 'danger' && 'border-[var(--danger-edge)] bg-[var(--danger-wash)]',
        tone === 'warning' && 'border-hair bg-[var(--warning-wash)]'
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'
        )}
        aria-hidden
      />
      <p>{children}</p>
    </div>
  );
}

/**
 * Moving a rider's balance by hand.
 *
 * Not a ConfirmDialog: this one collects the movement as well as confirming it,
 * and the reason is the part that matters — an adjustment without one is a
 * number in a ledger nobody can account for later. Submit stays disabled until
 * there is an amount and a reason worth reading, and the dialog says plainly
 * where the entry ends up.
 */
function AdjustBalanceDialog({ open, onOpenChange, riderId, name, currency, onDone }) {
  const [direction, setDirection] = useState(LEDGER_DIRECTION.CREDIT);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  /**
   * One key per filled-in form, sent with the request.
   *
   * The server posts an adjustment under this key, so a request that is retried
   * — a proxy giving up on a slow response, a second tap on the button — moves
   * the balance once. Clearing the form issues a new key, because a second
   * deliberate correction is a second movement and should post again.
   */
  const [submissionKey, setSubmissionKey] = useState(newKey);

  const value = Number(amount);
  const ready = value > 0 && reason.trim().length >= MIN_ADJUSTMENT_REASON;

  function close(next) {
    if (busy) return;
    if (!next) {
      setDirection(LEDGER_DIRECTION.CREDIT);
      setAmount('');
      setReason('');
      setNote('');
      setFields({});
      setError(null);
      setSubmissionKey(newKey());
    }
    onOpenChange(next);
  }

  async function submit() {
    if (!ready || busy) return;

    setBusy(true);
    setFields({});
    setError(null);

    try {
      await financeApi.adjustBalance(riderId, {
        direction,
        amount: value,
        reason: reason.trim(),
        idempotencyKey: submissionKey,
        ...(note.trim() ? { note: note.trim() } : {})
      });

      toast.success(
        `${direction === LEDGER_DIRECTION.CREDIT ? 'Credited' : 'Debited'} ${formatMoney(value, currency)}`
      );
      onDone();
      close(false);
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={close} title="Adjust this rider's balance" size="sm">
      <div className="space-y-4 p-4">
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-body">Direction</span>
          <div className="grid grid-cols-2 gap-2">
            {DIRECTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDirection(option.value)}
                aria-pressed={direction === option.value}
                className={cn(
                  'min-h-9 rounded-[var(--radius-field)] border px-3 py-1.5 text-[13px] font-medium transition-colors',
                  direction === option.value
                    ? 'border-[var(--accent)] bg-[var(--accent-wash)] text-accent'
                    : 'border-firm bg-surface text-muted hover:bg-[var(--surface-hover)] hover:text-body'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            {DIRECTIONS.find((option) => option.value === direction)?.description}
          </p>
        </div>

        <Field label="Amount" error={fields.amount} required>
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`Amount in ${currency}`}
              className="tabular"
              disabled={busy}
            />
          )}
        </Field>

        <Field
          label="Reason"
          error={fields.reason}
          hint={`At least ${MIN_ADJUSTMENT_REASON} characters. This is what the ledger and the audit log will say.`}
          required
        >
          {(props) => (
            <Textarea
              {...props}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder="For example: refunded a cancellation charged in error"
              disabled={busy}
            />
          )}
        </Field>

        <Field label="Note" error={fields.note} hint="Optional. Extra detail for whoever reads this later.">
          {(props) => (
            <Input
              {...props}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              disabled={busy}
            />
          )}
        </Field>

        <div className="flex items-start gap-2.5 rounded-[var(--radius-field)] bg-sunken p-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[12px] text-muted">
            This is posted to {name ? `${name}'s` : 'the rider’s'} wallet ledger as a manual adjustment and recorded in
            the audit log against your account. The rider is told. There is no way to undo it — a mistake is corrected
            by a second adjustment the other way.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-[12.5px] text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!ready} onClick={submit}>
            {direction === LEDGER_DIRECTION.CREDIT ? 'Credit' : 'Debit'}
            {value > 0 ? ` ${formatMoney(value, currency)}` : ' the rider'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DIRECTIONS = [
  {
    value: LEDGER_DIRECTION.CREDIT,
    label: 'Credit',
    description: 'In the rider’s favour: the platform owes them more, or they owe less.'
  },
  {
    value: LEDGER_DIRECTION.DEBIT,
    label: 'Debit',
    description: 'Against the rider: they owe more, or are owed less.'
  }
];
