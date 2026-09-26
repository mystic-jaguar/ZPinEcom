// Serviceable delivery area. The CUSTOMER may live anywhere — only the delivery
// address has to be inside a zone. Kept in sync with:
//   ZPinEcom/frontend/constants/delivery.ts
//   website-customer/backend/utils/delivery.js
//   website-customer/src/utils/delivery.js
// Change one, change all four. (The SQL helpers at the bottom are backend-only.)
//
// Zones (2026-09-15): Pune = 411xxx/412xxx AND a Pune/PCMC city; Muzaffarpur =
// exactly 842001–842004, pincode alone decides. A seller's products are shown to,
// and orderable by, customers in the SELLER's zone only.

export type Zone = 'pune' | 'muzaffarpur';

export const DELIVERY_CITY = 'Pune';
export const MUZAFFARPUR_PINCODES = ['842001', '842002', '842003', '842004'];
export const OUT_OF_AREA_MESSAGE =
  'We currently deliver only within Pune (pincode 411xxx / 412xxx) and Muzaffarpur (842001–842004). Please use an address in one of these areas.';
export const CROSS_ZONE_MESSAGE =
  'is not available for delivery to this address — it ships from a seller in a different city. Please remove it and try again.';

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

// A Pune address needs BOTH pincode and city to match Pune.
export function isPuneAddress(city?: string | null, pincode?: string | null): boolean {
  return isPunePincode(pincode) && isPuneCity(city);
}

// Which zone a pincode belongs to, or null when it is outside every zone.
export function zoneForPincode(pincode?: string | null): Zone | null {
  if (isPunePincode(pincode)) return 'pune';
  if (MUZAFFARPUR_PINCODES.includes(String(pincode ?? '').trim())) return 'muzaffarpur';
  return null;
}

export function isServiceablePincode(pincode?: string | null): boolean {
  return zoneForPincode(pincode) !== null;
}

// Delivery-address gate: Pune checks pincode + city, Muzaffarpur pincode only.
export function isServiceableAddress(city?: string | null, pincode?: string | null): boolean {
  const zone = zoneForPincode(pincode);
  return zone === 'muzaffarpur' || (zone === 'pune' && isPuneCity(city));
}

// A seller's zone from their shop pincode. Missing/unknown counts as Pune
// (owner decision 2026-09-15 — every pre-existing seller is a Pune seller).
export function sellerZone(pincode?: string | null): Zone {
  return zoneForPincode(pincode) === 'muzaffarpur' ? 'muzaffarpur' : 'pune';
}

// ── Backend-only SQL helpers ────────────────────────────────────────────────

// "This product's seller is in `zone`" — mirrors sellerZone(): only a
// Muzaffarpur shop pincode makes a Muzaffarpur seller, everything else is Pune.
// `zone` is always a Zone enum value, never raw request input.
export function sellerInZoneSql(zone: Zone, userCol = 'p.user_id'): string {
  const pins = MUZAFFARPUR_PINCODES.map((p) => `'${p}'`).join(',');
  const muz = `EXISTS (SELECT 1 FROM seller_business_details sbd
    WHERE sbd.user_id::text = ${userCol}::text AND btrim(sbd.pincode) IN (${pins}))`;
  return zone === 'muzaffarpur' ? muz : `NOT ${muz}`;
}

// Catalogue filter from a `?pincode=` query param, plus a cache-key suffix.
// Required since 2026-09-15 (every client build sends it): no pincode or one
// outside every zone → nothing is listed.
export function catalogZone(pincode: unknown, userCol = 'p.user_id'): { sql: string; key: string } {
  const zone = typeof pincode === 'string' ? zoneForPincode(pincode) : null;
  return zone ? { sql: ` AND ${sellerInZoneSql(zone, userCol)}`, key: `:z${zone}` } : { sql: ' AND false', key: ':znone' };
}
