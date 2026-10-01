import { LifeBuoy, MapPin, Receipt, Settings2 } from 'lucide-react';
import { ProfileScreen } from '@/components/common/ProfileScreen';

const LINKS = [
  { to: '/settings', icon: Settings2, title: 'Settings', hint: 'Notifications, privacy, appearance' },
  { to: '/saved-places', icon: MapPin, title: 'Saved places', hint: 'Home, work and the spots you use often' },
  { to: '/payments', icon: Receipt, title: 'Payments', hint: 'Every fare you have paid, and anything still open' },
  { to: '/help', icon: LifeBuoy, title: 'Help', hint: 'Payments, lost items, safety' }
];

export default function CustomerProfile() {
  return <ProfileScreen title="Profile" links={LINKS} />;
}
