import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/misc';
import { useComplaintCategories } from '@/hooks/useComplaints';
import { useSupportPaths } from '@/hooks/useSupportPaths';
import * as complaintApi from '@/services/complaint.api';
import { ALWAYS_URGENT, categoryHint, categoryLabel } from '@/constants/complaint';
import { shortAddress } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * Filing a complaint.
 *
 * Two steps on purpose: pick what it is about, then say what happened. A single
 * long form with a category dropdown at the top is how a report gets abandoned
 * halfway on a phone.
 *
 * The categories come from the server, so an admin adding one appears here with
 * no app change. A ride passed in through navigation state is attached, which is
 * what makes "report a problem with this trip" a two-tap action.
 */
export default function NewComplaint() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, loaded } = useComplaintCategories();
  const paths = useSupportPaths();

  // Set when arriving from a trip screen.
  const ride = location.state?.ride || null;
  const backTo = location.state?.from || paths.help;

  const [category, setCategory] = useState(null);
  const [values, setValues] = useState({ subject: '', description: '' });
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  const ready = values.subject.trim().length >= 4 && values.description.trim().length >= 10;

  async function submit() {
    if (!ready || busy) return;

    setBusy(true);
    setFields({});

    try {
      const complaint = await complaintApi.create({
        ...(ride?._id ? { rideId: ride._id } : {}),
        category,
        subject: values.subject.trim(),
        description: values.description.trim()
      });

      toast.success(`Report ${complaint.reference} received`);
      navigate(paths.detail(complaint.id), { replace: true });
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar
        title={category ? categoryLabel(category) : 'Report a problem'}
        back={category ? undefined : backTo}
        right={
          category ? (
            <Button variant="ghost" size="sm" onClick={() => setCategory(null)}>
              Change
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        {ride && (
          <Card>
            <CardBody className="py-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">About this trip</p>
              <p className="mt-0.5 truncate text-[14px] text-body">
                {shortAddress(ride.pickup?.address, 1)} <span className="text-faint">→</span>{' '}
                {shortAddress(ride.destination?.address, 1)}
              </p>
            </CardBody>
          </Card>
        )}

        <AnimatePresence mode="wait">
          {!category ? (
            <motion.div
              key="pick"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              {!loaded ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-card)]" />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardBody className="p-2">
                    {categories.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-body">{categoryLabel(key)}</span>
                            {ALWAYS_URGENT.includes(key) && (
                              <AlertTriangle className="size-3.5 text-[var(--danger)]" aria-hidden />
                            )}
                          </span>
                          {categoryHint(key) && (
                            <span className="mt-0.5 block text-[12.5px] text-muted">{categoryHint(key)}</span>
                          )}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                      </button>
                    ))}
                  </CardBody>
                </Card>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="write"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
            >
              {ALWAYS_URGENT.includes(category) && (
                <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-[var(--danger-edge)] bg-[var(--danger-wash)] p-3.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
                  <p className="text-[13px] text-body">
                    If you are in immediate danger, call your local emergency number first. This report goes to
                    support as urgent, but it is not an emergency service.
                  </p>
                </div>
              )}

              <Card>
                <CardBody className="space-y-4">
                  <Field label="In a few words" error={fields.subject}>
                    {(props) => (
                      <Input
                        {...props}
                        value={values.subject}
                        maxLength={140}
                        autoFocus
                        onChange={(event) => setValues((v) => ({ ...v, subject: event.target.value }))}
                        placeholder="Charged twice for one trip"
                      />
                    )}
                  </Field>

                  <Field
                    label="What happened?"
                    error={fields.description}
                    hint="The more detail, the less support has to ask."
                  >
                    {(props) => (
                      <textarea
                        {...props}
                        value={values.description}
                        rows={6}
                        maxLength={4000}
                        onChange={(event) => setValues((v) => ({ ...v, description: event.target.value }))}
                        placeholder="Tell us what went wrong, and what you would like done about it."
                        className={cn(
                          'w-full resize-y rounded-2xl border border-hair bg-sunken px-3.5 py-3 text-[15px] text-body',
                          'outline-none placeholder:text-faint focus-visible:border-[var(--accent)]',
                          fields.description && 'border-[var(--danger)]'
                        )}
                      />
                    )}
                  </Field>

                  <Button size="lg" block loading={busy} disabled={!ready} onClick={submit}>
                    <Send aria-hidden />
                    Send the report
                  </Button>

                  <p className="text-center text-[12px] text-faint">
                    You will get a reference number and can follow the reply here.
                  </p>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
