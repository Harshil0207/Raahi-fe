import { useState } from 'react';
import { Briefcase, House, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { BottomSheet, SheetHeader } from '@/components/ui/sheet';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/misc';
import { PlacePicker } from '@/components/customer/PlacePicker';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { shortAddress } from '@/utils/format';
import { cn } from '@/lib/utils';

const LABEL_ICON = { home: House, work: Briefcase, custom: MapPin };

export default function SavedPlaces() {
  const { places, loaded, error, reload, save, remove } = useSavedPlaces();

  // `draft` holds the label being added/edited; `picking` opens the map picker.
  const [draft, setDraft] = useState(null);
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const openFor = (label, existing) => {
    setDraft({ label, id: existing?.id ?? null, place: existing ?? null });
    setName(existing?.name ?? (label === 'home' ? 'Home' : label === 'work' ? 'Work' : ''));
    setPicking(!existing);
  };

  async function commit() {
    if (!draft?.place || saving) return;

    setSaving(true);
    try {
      await save(
        {
          label: draft.label,
          name: name.trim() || draft.place.name || 'Saved place',
          address: draft.place.address,
          placeId: draft.place.placeId,
          lat: draft.place.lat,
          lng: draft.place.lng
        },
        draft.id
      );
      toast.success('Place saved');
      setDraft(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(place) {
    try {
      await remove(place.id);
      toast.success(`${place.name} removed`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const home = places.find((p) => p.label === 'home');
  const work = places.find((p) => p.label === 'work');
  const custom = places.filter((p) => p.label === 'custom');

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Saved places" back="/profile" />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        {!loaded && <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />}

        {loaded && error && <ErrorState description={error} onRetry={reload} />}

        {loaded && !error && (
          <>
            <Card>
              <CardBody className="space-y-2 p-2">
                <Shortcut label="home" place={home} onSet={openFor} onRemove={handleRemove} />
                <Shortcut label="work" place={work} onSet={openFor} onRemove={handleRemove} />
              </CardBody>
            </Card>

            <div className="flex items-center justify-between px-1 pt-2">
              <h2 className="text-[13px] font-semibold text-body">Other places</h2>
              <Button variant="subtle" size="sm" onClick={() => openFor('custom')}>
                <Plus aria-hidden />
                Add
              </Button>
            </div>

            {custom.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No other places"
                description="Save the spots you go to often so booking is two taps."
              />
            ) : (
              <Card>
                <CardBody className="space-y-2 p-2">
                  {custom.map((place) => (
                    <Shortcut key={place.id} label="custom" place={place} onSet={openFor} onRemove={handleRemove} />
                  ))}
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>

      {picking && (
        <PlacePicker
          key={draft?.label}
          title={draft?.label === 'home' ? 'Where is home?' : draft?.label === 'work' ? 'Where is work?' : 'Pick a place'}
          onOpenChange={(open) => {
            if (!open) {
              setPicking(false);
              // Closing the picker without choosing abandons the whole draft.
              setDraft((d) => (d?.place ? d : null));
            }
          }}
          onSelect={(place) => {
            setDraft((d) => ({ ...d, place }));
            setName((n) => n || place.address.split(',')[0]);
            setPicking(false);
          }}
        />
      )}

      <BottomSheet
        open={Boolean(draft?.place) && !picking}
        onOpenChange={(open) => !open && setDraft(null)}
        label="Name this place"
      >
        <SheetHeader title="Name this place" description={shortAddress(draft?.place?.address, 3)} />
        <div className="space-y-4 px-5 pb-6 pb-safe">
          <Field label="Name">
            {(props) => (
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} placeholder="Gym, Mum's place…" />
            )}
          </Field>
          <div className="flex gap-2">
            <Button variant="outline" block onClick={() => setPicking(true)}>
              Change location
            </Button>
            <Button block loading={saving} onClick={commit}>
              Save
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function Shortcut({ label, place, onSet, onRemove }) {
  const Icon = LABEL_ICON[label];
  const title = place?.name || (label === 'home' ? 'Add home' : label === 'work' ? 'Add work' : 'Saved place');

  return (
    <div className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-[var(--surface-sunken)]">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl',
          place ? 'bg-[var(--accent-wash)] text-accent' : 'bg-sunken text-faint'
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>

      <button type="button" onClick={() => onSet(label, place)} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-medium text-body">{title}</span>
        <span className="block truncate text-[12px] text-muted">
          {place ? shortAddress(place.address, 2) : 'Not set'}
        </span>
      </button>

      {place && (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onSet(label, place)} aria-label={`Edit ${place.name}`}>
            <Pencil aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onRemove(place)} aria-label={`Remove ${place.name}`}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
