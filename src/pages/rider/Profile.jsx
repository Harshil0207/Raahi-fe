import { useState } from 'react';
import { ChartNoAxesColumn, LifeBuoy, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileScreen } from '@/components/common/ProfileScreen';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import * as riderApi from '@/services/rider.api';
import { VEHICLE_TYPES } from '@/constants/ride';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/rider/settings', icon: Settings2, title: 'Settings', hint: 'Alerts, navigation, availability' },
  { to: '/rider/statistics', icon: ChartNoAxesColumn, title: 'Statistics', hint: 'Acceptance, ratings, distance' },
  { to: '/rider/help', icon: LifeBuoy, title: 'Help', hint: 'Earnings, payments, safety' }
];

export default function RiderProfile() {
  const { rider, setRider } = useAuth();

  const [vehicle, setVehicle] = useState({
    type: rider?.vehicle?.type ?? 'bike',
    make: rider?.vehicle?.make ?? '',
    model: rider?.vehicle?.model ?? '',
    numberPlate: rider?.vehicle?.numberPlate ?? '',
    color: rider?.vehicle?.color ?? ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const updated = await riderApi.updateProfile({
        vehicle: { ...vehicle, numberPlate: vehicle.numberPlate.trim().toUpperCase() }
      });
      setRider(updated);
      toast.success('Vehicle updated');
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (key) => (e) => setVehicle((v) => ({ ...v, [key]: e.target.value }));

  return (
    <ProfileScreen title="Rider profile" links={LINKS}>
      <Card>
        <CardBody className="space-y-4">
          <div>
            <p className="font-semibold text-body">Vehicle</p>
            <p className="text-xs text-muted">Customers see this when you accept their ride.</p>
          </div>

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
            {VEHICLE_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={vehicle.type === option.value}
                onClick={() => setVehicle((v) => ({ ...v, type: option.value }))}
                className={cn(
                  'h-11 rounded-xl border text-sm font-medium transition-colors',
                  vehicle.type === option.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/12 text-[var(--accent)]'
                    : 'border-hair bg-sunken text-muted'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Field label="Number plate" error={errors['vehicle.numberPlate']}>
            {(props) => (
              <Input {...props} className="uppercase" value={vehicle.numberPlate} onChange={set('numberPlate')} />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Make">{(props) => <Input {...props} value={vehicle.make} onChange={set('make')} />}</Field>
            <Field label="Model">{(props) => <Input {...props} value={vehicle.model} onChange={set('model')} />}</Field>
          </div>

          <Field label="Colour">{(props) => <Input {...props} value={vehicle.color} onChange={set('color')} />}</Field>

          <Button block loading={saving} onClick={save}>
            Save vehicle
          </Button>
        </CardBody>
      </Card>

      {rider?.licence?.number && (
        <Card>
          <CardBody className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Licence</p>
              <p className="font-medium tracking-wide text-body">{rider.licence.number}</p>
            </div>
          </CardBody>
        </Card>
      )}
    </ProfileScreen>
  );
}
