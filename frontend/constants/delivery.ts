// Every order is promised the same window — show this, never a raw delivery time.
export const DELIVERY_ETA = 'Within 12 hrs';

// Delivery is currently restricted to Pune (core city 411xxx + greater/PCMC 412xxx).
export const DELIVERY_CITY = 'Pune';

// Pune district pincodes: core Pune 411xxx, PCMC / greater Pune 412xxx.
export function isPunePincode(pincode?: string | null): boolean {
    if (!pincode) return false;
    return /^41[12]\d{3}$/.test(pincode.trim());
}

// City/district text that counts as the Pune metro (incl. PCMC).
export function isPuneCity(city?: string | null): boolean {
    if (!city) return false;
    return /pune|pimpri|chinchwad|pcmc/i.test(city.trim());
}

// A saved address is serviceable only if BOTH pincode and city match Pune.
export function isPuneAddress(city?: string | null, pincode?: string | null): boolean {
    return isPunePincode(pincode) && isPuneCity(city);
}

// GPS reverse-geocode is looser: any Pune-area signal counts (used for the home banner only).
export function isPuneLocation(fields: {
    city?: string | null;
    district?: string | null;
    subregion?: string | null;
    postalCode?: string | null;
}): boolean {
    return (
        isPuneCity(fields.city) ||
        isPuneCity(fields.district) ||
        isPuneCity(fields.subregion) ||
        isPunePincode(fields.postalCode)
    );
}
