// Serviceable delivery area. The CUSTOMER may live anywhere — only the delivery
// address has to be inside Pune. Kept byte-for-byte in sync with:
//   ZPinEcom/frontend/constants/delivery.ts
//   website-customer/backend/utils/delivery.js
//   website-customer/src/utils/delivery.js
// Change one, change all four.

export const DELIVERY_CITY = 'Pune';
export const OUT_OF_AREA_MESSAGE =
  'We currently deliver only within Pune. Please use a Pune delivery address (pincode 411xxx / 412xxx).';

// Pune district pincodes: core Pune 411xxx, PCMC / greater Pune 412xxx.
export function isPunePincode(pincode?: string | null): boolean {
  if (!pincode) return false;
  return /^41[12]\d{3}$/.test(String(pincode).trim());
}

// City/district text that counts as the Pune metro (incl. PCMC).
export function isPuneCity(city?: string | null): boolean {
  if (!city) return false;
  return /pune|pimpri|chinchwad|pcmc/i.test(String(city).trim());
}

// A delivery address is serviceable only if BOTH pincode and city match Pune.
export function isPuneAddress(city?: string | null, pincode?: string | null): boolean {
  return isPunePincode(pincode) && isPuneCity(city);
}
