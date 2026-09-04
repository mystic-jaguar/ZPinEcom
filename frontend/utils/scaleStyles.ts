/**
 * The pure half of constants/theme.createStyles: walk a style tree and scale the numbers
 * that are real measurements.
 *
 * Split out of theme.ts only so it can be exercised without a React Native
 * runtime (constants/theme.ts reads Dimensions at module load). theme.ts supplies the
 * actual scale function.
 */

/**
 * Properties whose numbers are real measurements and should follow the device.
 *
 * Deliberately excludes borderWidth and separator hairlines: a 1px rule is a
 * hairline on every phone, and scaling it only makes it blurry or invisible.
 */
export const SCALABLE = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'fontSize', 'lineHeight',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'paddingHorizontal', 'paddingVertical', 'paddingStart', 'paddingEnd',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'gap', 'rowGap', 'columnGap',
  'top', 'bottom', 'left', 'right',
  'shadowRadius',
]);

/** Values at or above this are sentinels ("bigger than any height"), not sizes. */
export const SENTINEL = 999;

/** Below this, scaling is rounding noise and can erase a 1px rule. */
export const MIN_SCALABLE = 2;

export const scaleTree = (node: any, scale: (n: number) => number): any => {
  if (Array.isArray(node)) return node.map((n) => scaleTree(n, scale));
  if (!node || typeof node !== 'object') return node;
  const out: any = {};
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === 'object' && v !== null) out[k] = scaleTree(v, scale);
    else if (SCALABLE.has(k) && typeof v === 'number' && Math.abs(v) > MIN_SCALABLE && v < SENTINEL) {
      out[k] = scale(v);
    } else out[k] = v;
  }
  return out;
};

/* ============ DEVICE SCALE ============ */

/** The device the UI was drawn against (iPhone 14 / Pixel 7 class). */
export const BASELINE_WIDTH = 390;

/**
 * Floor of 1.0: this app never scales DOWN. Shrinking a 320dp phone would take a
 * 44dp tap target under the iOS/Android minimums and 14px body text to 12px —
 * making cheap devices worse in the name of consistency. Ceiling of 1.10 keeps a
 * large phone a modest lift rather than a stretched layout.
 */
export const MIN_SCALE = 1.0;
export const MAX_SCALE = 1.1;

/** Clamped device scale for a given window width. Pure, so it can be tested. */
export const deviceScale = (windowWidth: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, windowWidth / BASELINE_WIDTH));
