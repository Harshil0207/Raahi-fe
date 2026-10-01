import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Plus,
  QrCode,
  RefreshCw,
  TriangleAlert,
  Wallet as WalletIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { BottomSheet, SheetHeader } from '@/components/ui/sheet';
import { Field, Input } from '@/components/ui/input';
import { EmptyState, Skeleton, Spinner, StatusBadge } from '@/components/ui/misc';
import { useSocketEvents } from '@/hooks/useSocket';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import * as walletApi from '@/services/wallet.api';
import { formatMoney, formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';
import { SOCKET_EVENTS } from '@/constants/socketEvents';
import {
  LEDGER_DIRECTION,
  LEDGER_TYPE_LABEL,
  RECHARGE_STATUS_LABEL,
  RECHARGE_STATUS_TONE,
  WALLET_STATUS
} from '@/constants/ride';

/**
 * Fetch-on-mount with a refetch handle.
 *
 * Local to this screen rather than shared: the rest of the app manages its own
 * request state inline, and one page needing the same three lines four times is
 * not yet a reason to introduce an abstraction everything else would have to
 * learn.
 */
function useResource(load) {
  // The loader is usually an inline arrow, so it is a new function on every
  // render. Parking it in a ref *from inside an effect* keeps it out of the
  // fetching effect's dependencies — where it would re-fetch forever — without
  // writing to a ref during render, which React cannot see.
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });

  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true }));

    // `loader.current` is still the first render's function on the first pass,
    // which is the one we want; later passes only happen on an explicit
    // refetch, by which time the ref has caught up.
    loader
      .current()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((err) => alive && setState({ data: null, error: err.message, loading: false }));

    return () => {
      alive = false;
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  return { ...state, refetch };
}

/**
 * The rider's money.
 *
 * The screen is built around one distinction, and everything else follows from
 * it: what the rider has *earned* and what the rider *owes the platform* are
 * different numbers that move in different directions for different reasons.
 * A rider who takes cash all day earns well and owes more; a rider on UPI earns
 * the same and owes nothing. Showing those as one figure — or letting one
 * offset the other on screen — is how a driver ends up surprised at the start
 * of a shift.
 *
 * So the two sit in separate cards with separate headings, and only the one
 * that can stop them driving gets the loud treatment.
 */
export default function RiderWallet() {
  const { data, loading, error, refetch } = useResource(walletApi.getWallet);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The balance moves when a ride settles, which can happen while this screen
  // is open.
  useSocketEvents({ [SOCKET_EVENTS.WALLET_UPDATED]: () => refetch() }, [refetch]);

  const wallet = data?.wallet;
  const earnings = data?.earnings;

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Wallet" />

      <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-6">
        {loading && !wallet ? (
          <>
            <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
          </>
        ) : error ? (
          <EmptyState
            icon={TriangleAlert}
            title="Could not load your wallet"
            description={error}
            action={<Button onClick={refetch}>Try again</Button>}
          />
        ) : (
          wallet && (
            <>
              {wallet.status === WALLET_STATUS.PAYMENT_REQUIRED && (
                <BlockedNotice wallet={wallet} onRecharge={() => setSheetOpen(true)} />
              )}

              {wallet.nearingLimit && <WarningNotice wallet={wallet} />}

              <OutstandingCard wallet={wallet} onRecharge={() => setSheetOpen(true)} />
              <EarningsCard wallet={wallet} earnings={earnings} />
              <RechargeHistory />
              <Ledger />
            </>
          )
        )}
      </div>

      <RechargeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        wallet={wallet}
        onDone={() => {
          setSheetOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ notices

function BlockedNotice({ wallet, onRecharge }) {
  return (
    <section
      aria-label="Payment required"
      className="rounded-[var(--radius-card)] border border-[var(--danger-edge)] bg-[var(--danger-wash)] p-4"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-body">Payment required</p>
          <p className="mt-1 text-[13px] leading-snug text-body">
            Your platform balance is{' '}
            <span className="tabular font-semibold">{formatMoney(wallet.outstanding, wallet.currency)}</span>.
            Recharge at least{' '}
            <span className="tabular font-semibold">{formatMoney(wallet.requiredRecharge, wallet.currency)}</span>{' '}
            to go online.
          </p>
        </div>
      </div>

      <Button block size="lg" className="mt-3" onClick={onRecharge}>
        <Plus aria-hidden />
        Recharge {formatMoney(wallet.requiredRecharge, wallet.currency)}
      </Button>
    </section>
  );
}

function WarningNotice({ wallet }) {
  return (
    <p className="flex items-start gap-2.5 rounded-2xl border border-[var(--warning-edge)] bg-[var(--warning-wash)] p-3 text-[13px] leading-snug text-body">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
      <span>
        You owe {formatMoney(wallet.outstanding, wallet.currency)} of a{' '}
        {formatMoney(wallet.threshold, wallet.currency)} limit. Recharge before it stops you going online.
      </span>
    </p>
  );
}

// -------------------------------------------------------------------- cards

/**
 * What the rider owes.
 *
 * Given the most room because it is the number that can stop them working. The
 * bar is a real proportion of the configured ceiling rather than decoration —
 * a rider should be able to tell at a glance how much road they have left.
 */
function OutstandingCard({ wallet, onRecharge }) {
  const pct = wallet.threshold > 0 ? Math.min((wallet.outstanding / wallet.threshold) * 100, 100) : 0;
  const blocked = wallet.status === WALLET_STATUS.PAYMENT_REQUIRED;

  return (
    <section aria-label="Platform balance" className="rounded-[var(--radius-card)] border border-hair bg-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">
            Outstanding platform balance
          </h2>
          <p className="tabular mt-1 break-words text-[30px] font-semibold leading-none text-body">
            {formatMoney(wallet.outstanding, wallet.currency)}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-body">
          <WalletIcon className="size-[18px]" aria-hidden />
        </span>
      </div>

      {wallet.threshold > 0 && (
        <>
          <div
            className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken"
            role="progressbar"
            aria-valuenow={Math.round(wallet.outstanding)}
            aria-valuemin={0}
            aria-valuemax={wallet.threshold}
            aria-label="Balance against the limit"
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-soft)]',
                blocked ? 'bg-[var(--danger)]' : wallet.nearingLimit ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'
              )}
              style={{ width: `${Math.max(pct, wallet.outstanding > 0 ? 4 : 0)}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Limit {formatMoney(wallet.threshold, wallet.currency)} · owe more than this and you cannot go
            online
          </p>
        </>
      )}

      {!blocked && (
        <Button variant="outline" block className="mt-3.5" onClick={onRecharge}>
          <Plus aria-hidden />
          Recharge balance
        </Button>
      )}
    </section>
  );
}

/**
 * What the rider earned.
 *
 * Deliberately a separate card from the one above. The figures here come from
 * completed rides; the balance above comes from the ledger. They are related
 * but they are not the same question, and a rider must never read one as the
 * other.
 */
function EarningsCard({ wallet, earnings }) {
  const window = earnings?.today || earnings?.window;
  const unit = wallet.currency;

  return (
    <section aria-label="Earnings" className="rounded-[var(--radius-card)] border border-hair bg-elevated p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">Today&apos;s earnings</h2>
        <Link
          to="/rider/earnings"
          className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-medium text-accent"
        >
          Breakdown
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <p className="tabular mt-1 break-words text-[26px] font-semibold leading-none text-body">
        {formatMoney(window?.total ?? 0, unit)}
      </p>
      <p className="mt-1 text-[12px] text-muted">
        {window?.trips ?? 0} {window?.trips === 1 ? 'trip' : 'trips'} · after commission
      </p>

      <dl className="mt-3.5 grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-hair pt-3.5 sm:grid-cols-2">
        <Row icon={Banknote} label="Cash collected" value={formatMoney(window?.cashCollected ?? 0, unit)} />
        <Row icon={QrCode} label="Paid online" value={formatMoney(window?.upiCollected ?? 0, unit)} />
        <Row label="Platform commission" value={formatMoney(window?.commission ?? 0, unit)} muted />
        <Row label="Lifetime earnings" value={formatMoney(wallet.lifetime?.earnings ?? 0, unit)} muted />
      </dl>

      {wallet.available > 0 && (
        <p className="mt-3 border-t border-hair pt-3 text-[12.5px] leading-snug text-muted">
          Available earnings{' '}
          <span className="tabular font-medium text-body">{formatMoney(wallet.available, unit)}</span> — the
          platform holds this for you from rides paid online.
        </p>
      )}
    </section>
  );
}

function Row({ icon: Icon, label, value, muted }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted">
        {Icon && <Icon className="size-3.5 shrink-0 text-faint" aria-hidden />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn('tabular shrink-0 text-[13.5px] font-medium', muted ? 'text-muted' : 'text-body')}>
        {value}
      </dd>
    </div>
  );
}

// ------------------------------------------------------------------ history

function RechargeHistory() {
  const { data, loading } = useResource(() => walletApi.getRecharges({ limit: 5 }));
  const rows = data?.recharges || [];

  if (loading) return <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />;
  if (!rows.length) return null;

  return (
    <section aria-label="Recharges" className="rounded-[var(--radius-card)] border border-hair bg-elevated p-4">
      <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">Recharges</h2>

      <ul className="mt-2.5 divide-y divide-[var(--border)]">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="tabular text-[14px] font-medium text-body">
                {formatMoney(row.amount, row.currency)}
              </p>
              <p className="text-[11.5px] text-muted">{formatRelative(row.createdAt)}</p>
            </div>
            <StatusBadge tone={RECHARGE_STATUS_TONE[row.status] || 'neutral'}>
              {RECHARGE_STATUS_LABEL[row.status] || row.status}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Every movement, in order.
 *
 * A credit is shown with a plus and a debit with a minus, both derived from
 * `direction` rather than from the sign of the amount — the amount is always
 * positive. A memo carries no sign at all and is drawn muted, because it
 * records something true about a ride without moving any money: the platform's
 * commission, and the fare a gateway collected on the platform's behalf.
 */
function Ledger() {
  const { data, loading } = useResource(() => walletApi.getLedger({ limit: 20 }));
  const entries = data?.entries || [];

  if (loading) return <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />;

  return (
    <section aria-label="Transactions" className="rounded-[var(--radius-card)] border border-hair bg-elevated p-4">
      <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted">Transactions</h2>

      {!entries.length ? (
        <p className="py-6 text-center text-[13.5px] text-muted">No transactions yet.</p>
      ) : (
        <ul className="mt-2.5 divide-y divide-[var(--border)]">
          {entries.map((entry) => (
            <LedgerRow key={entry._id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LedgerRow({ entry }) {
  const memo = entry.direction === LEDGER_DIRECTION.MEMO;
  const credit = entry.direction === LEDGER_DIRECTION.CREDIT;

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13.5px] font-medium', memo ? 'text-muted' : 'text-body')}>
          {LEDGER_TYPE_LABEL[entry.type] || entry.type}
        </p>
        <p className="truncate text-[11.5px] text-faint">{entry.description}</p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            'tabular text-[13.5px] font-semibold',
            memo ? 'text-faint' : credit ? 'text-[var(--success)]' : 'text-body'
          )}
        >
          {/* A memo moves nothing, so it gets no sign — a "+" here would read
              as money arriving that never did. U+2212 rather than a hyphen so
              the minus lines up with the digits. */}
          {memo ? '' : credit ? '+' : '−'}
          {formatMoney(entry.amount, entry.currency)}
        </p>
        <p className="text-[11px] text-faint">{formatRelative(entry.createdAt)}</p>
      </div>
    </li>
  );
}

// ----------------------------------------------------------------- recharge

/**
 * Paying down the balance.
 *
 * The minimum comes from the server and is shown before the rider types, so a
 * refusal is never the first they hear of it. The backend enforces it anyway —
 * this is a courtesy, not the rule.
 */
function RechargeSheet({ open, onOpenChange, wallet, onDone }) {
  const reduced = usePrefersReducedMotion();
  const minimum = wallet?.minimumRecharge ?? 0;
  const suggested = wallet?.requiredRecharge > 0 ? wallet.requiredRecharge : minimum;

  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState('amount');
  const [recharge, setRecharge] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setStage('amount');
    setAmount(String(suggested || minimum || ''));
    setRecharge(null);
    setQr(null);
    setError(null);
  }, [open, suggested, minimum]);

  const value = Number(amount);
  const tooSmall = Number.isFinite(value) && value > 0 && value < minimum;
  const ready = Number.isFinite(value) && value >= minimum;

  const check = useCallback(async () => {
    if (!recharge) return;
    try {
      const result = await walletApi.getRechargeStatus(recharge.id);
      if (!alive.current) return;

      setRecharge(result.recharge);
      if (result.recharge.status === 'PAID') {
        setStage('done');
        toast.success('Balance updated');
      }
      if (result.recharge.status === 'FAILED') {
        setError(result.recharge.failureReason || 'The payment did not go through.');
        setStage('amount');
      }
    } catch {
      // A failed poll is a network blip, not a failed payment.
    }
  }, [recharge]);

  /**
   * Development only; see the note beside the control that calls this.
   *
   * It does not set the stage itself — `check` does, from the server's answer.
   * That way the success path here is the same one a real payment takes, and a
   * simulated payment cannot show "done" unless the ledger actually posted.
   */
  const [simulating, setSimulating] = useState(false);
  const simulate = useCallback(
    async (outcome) => {
      if (!recharge || simulating) return;
      setSimulating(true);
      setError(null);
      try {
        await walletApi.simulateRecharge(recharge.id, outcome);
        await check();
      } catch (err) {
        setError(err.message);
      } finally {
        setSimulating(false);
      }
    },
    [recharge, simulating, check]
  );

  useEffect(() => {
    if (stage !== 'waiting') return undefined;
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, [stage, check]);

  async function start() {
    setError(null);
    setWorking(true);
    try {
      const result = await walletApi.startRecharge(value);
      setRecharge(result.recharge);
      setQr(result.qr);
      setStage('waiting');
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} label="Recharge balance">
      <SheetHeader
        title="Recharge balance"
        description={
          stage === 'waiting'
            ? 'Scan with any UPI app to pay.'
            : `Pay towards what you owe the platform. Minimum ${formatMoney(minimum, wallet?.currency)}.`
        }
      />

      <div className="space-y-4 px-4 pb-4">
        <AnimatePresence initial={false} mode="wait">
          {stage === 'amount' && (
            <motion.div
              key="amount"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Field
                label="Amount"
                error={tooSmall ? `The smallest recharge is ${formatMoney(minimum, wallet?.currency)}` : undefined}
              >
                {(props) => (
                  <Input
                    {...props}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal"
                    autoFocus
                  />
                )}
              </Field>

              <div className="flex flex-wrap gap-2">
                {[minimum, 100, 200, 500]
                  .filter((v, i, all) => v >= minimum && all.indexOf(v) === i)
                  .map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className="tabular rounded-full border border-hair px-3.5 py-2 text-[13px] font-medium text-body hover:bg-[var(--surface-sunken)]"
                    >
                      {formatMoney(preset, wallet?.currency)}
                    </button>
                  ))}
              </div>

              {wallet?.outstanding > 0 && ready && (
                <p className="flex items-center gap-1.5 rounded-2xl bg-sunken p-3 text-[12.5px] text-muted">
                  <span className="tabular">{formatMoney(wallet.outstanding, wallet.currency)}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
                  <span className="tabular font-medium text-body">
                    {formatMoney(Math.max(wallet.outstanding - value, 0), wallet.currency)}
                  </span>
                  <span>owed after this</span>
                </p>
              )}

              {error && (
                <p className="rounded-2xl bg-[var(--danger-wash)] p-3 text-[12.5px] leading-snug text-body">
                  {error}
                </p>
              )}

              <Button block size="lg" disabled={!ready} loading={working} onClick={start}>
                Continue
              </Button>
            </motion.div>
          )}

          {stage === 'waiting' && (
            <motion.div
              key="waiting"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {qr?.svg ? (
                <div className="rounded-2xl border border-hair bg-paper p-4">
                  {/* Our own backend's rendering of a payload it built. */}
                  <div
                    className="mx-auto grid aspect-square w-full max-w-[14rem] place-items-center [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qr.svg }}
                    role="img"
                    aria-label={`Payment code for ${formatMoney(recharge?.amount, recharge?.currency)}`}
                  />
                  <p className="tabular mt-3 text-center text-[19px] font-semibold text-body">
                    {formatMoney(recharge?.amount, recharge?.currency)}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl bg-sunken p-4 text-center text-[13px] text-muted">
                  Waiting for the payment to be set up…
                </p>
              )}

              <div
                className="flex items-center gap-2.5 rounded-2xl border border-[var(--warning-edge)] bg-[var(--warning-wash)] p-3 text-[13px]"
                aria-live="polite"
              >
                <Spinner className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 text-body">Waiting for payment…</span>
                <button
                  type="button"
                  onClick={check}
                  className="shrink-0 rounded-full p-2 text-muted hover:text-body"
                  aria-label="Check again"
                >
                  <RefreshCw className="size-4" aria-hidden />
                </button>
              </div>

              {/**
               * The development shortcut past a payment nobody can make.
               *
               * A sandbox recharge waits for something outside the app to
               * settle it — deliberately, because a rider must never be able to
               * declare their own payment received. That leaves a balance
               * unclearable while developing, so this stands in for the UPI
               * app.
               *
               * Three things keep it out of production: it renders only in a
               * development build (`import.meta.env.DEV` is compiled out), only
               * when the server says this payment is a sandbox one, and the
               * endpoint it calls is not mounted on a production server. It is
               * styled as a warning rather than a primary action because it is
               * scaffolding, not a feature.
               */}
              {import.meta.env.DEV && qr?.sandbox && (
                <div className="rounded-2xl border border-dashed border-[var(--warning-edge)] p-3">
                  <p className="text-[12px] font-medium leading-tight text-body">
                    Development only
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
                    No real money moves. This marks the sandbox payment received, exactly as a UPI
                    app would, and the balance then settles through the normal path.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 flex-1"
                      loading={simulating}
                      onClick={() => simulate('PAID')}
                    >
                      Mark as paid
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11"
                      disabled={simulating}
                      onClick={() => simulate('FAILED')}
                    >
                      Fail it
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                block
                onClick={async () => {
                  await walletApi.cancelRecharge(recharge.id).catch(() => {});
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
            </motion.div>
          )}

          {stage === 'done' && (
            <motion.div
              key="done"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--success-edge)] bg-[var(--success-wash)] p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--success)]" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-body">
                    {formatMoney(recharge?.amount, recharge?.currency)} received
                  </p>
                  {recharge?.balanceBefore != null && (
                    <p className="tabular mt-0.5 text-[12.5px] text-muted">
                      Balance owed {formatMoney(Math.abs(Math.min(recharge.balanceBefore, 0)), recharge.currency)}{' '}
                      → {formatMoney(Math.abs(Math.min(recharge.balanceAfter, 0)), recharge.currency)}
                    </p>
                  )}
                </div>
              </div>

              <Button block size="lg" onClick={onDone}>
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
