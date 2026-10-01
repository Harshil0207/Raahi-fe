import { Ambulance, Bike, Boxes, Car, CarTaxiFront, Package } from 'lucide-react';

/**
 * One place that decides what a service looks like.
 *
 * The point of routing every icon through here is that changing how a bike
 * reads is one edit, not a search across the codebase — and that a service
 * added tomorrow cannot render as a blank square, because `Package` catches
 * anything unmapped.
 *
 * Lucide throughout, at one stroke weight, so nothing looks borrowed from a
 * different set.
 */
export const SERVICE_ICONS = {
  BIKE: Bike,
  // A three-wheeler, not a lorry: Truck reads as freight and an auto is a taxi.
  AUTO: CarTaxiFront,
  CAR: Car,
  AMBULANCE: Ambulance,
  // A parcel reads as a package first and a vehicle second — the vehicle is in
  // the label beside it. One box for the small service, several for the larger
  // one, which is the actual difference between them.
  BIKE_PARCEL: Package,
  AUTO_PARCEL: Boxes
};

export const iconForService = (serviceType) => SERVICE_ICONS[serviceType] || Package;
