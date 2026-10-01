import {
  Ambulance,
  Bell,
  Bike,
  Boxes,
  Car,
  CarTaxiFront,
  CircleDot,
  Clock,
  CreditCard,
  Flag,
  LifeBuoy,
  LocateFixed,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Power,
  Route,
  UserRound,
  Wallet
} from 'lucide-react';

/**
 * Every icon the app uses, named once.
 *
 * The point is not to save imports. It is that "what does a parcel look like"
 * has one answer, and changing it is one edit rather than a search across forty
 * files that each picked something slightly different. Anything not in here is
 * a one-off inside its own screen.
 *
 * All Lucide, so the stroke weight and optical size match wherever two icons
 * sit next to each other.
 */

/** Service type to icon. A service added later falls back to a package. */
export const SERVICE_ICONS = {
  BIKE: Bike,
  // A three-wheeler is a taxi, not freight — Truck reads as a lorry.
  AUTO: CarTaxiFront,
  CAR: Car,
  AMBULANCE: Ambulance,
  // A parcel reads as a package first; which vehicle carries it is in the label
  // beside it. One box for the small service, several for the larger one.
  BIKE_PARCEL: Package,
  AUTO_PARCEL: Boxes
};

export const iconForService = (serviceType) => SERVICE_ICONS[serviceType] || Package;

/** The rest of the app's vocabulary. */
export const ICONS = {
  // Places
  pickup: CircleDot,
  destination: Flag,
  location: MapPin,
  navigation: Navigation,
  nearMe: LocateFixed,

  // The job
  ride: Route,
  parcel: Package,
  history: Clock,

  // Money
  earnings: Wallet,
  payment: CreditCard,

  // Talking to people
  chat: MessageSquare,
  complaint: LifeBuoy,
  notifications: Bell,

  // The rider's own state
  online: Power,
  profile: UserRound
};
