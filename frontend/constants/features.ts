/**
 * App feature flags.
 *
 * WALLET_ENABLED — the ZPIN stored-value wallet is a Prepaid Payment Instrument
 * (PPI) under RBI regulations and may not be offered without authorization.
 * It is on hold until that compliance is in place, so the wallet is hidden as a
 * payment method and as a refund destination across the app. Flip this to `true`
 * to re-enable the wallet everywhere it is gated.
 */
export const WALLET_ENABLED = false;
