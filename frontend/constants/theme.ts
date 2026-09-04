/**
 * ZPIN design tokens — ported from "ZPIN Screens v2" design system.
 * Single source of truth for colour, type, spacing, radius, shadow and motion.
 * Screens should import from here rather than hard-coding hex/px values.
 */
import { Dimensions, PixelRatio, StyleSheet } from 'react-native';
import { deviceScale, scaleTree } from '../utils/scaleStyles';

/* ============ DEVICE SCALING ============ */
/**
 * Device-width scaling for every size token in this file.
 *
 * The app is portrait-locked and phones-only (app.json: orientation "portrait",
 * ios.supportsTablet false), so the window width never changes at runtime and
 * reading it once at module load is safe — no hook, no re-render, and the tokens
 * below stay plain numbers that StyleSheet can hoist.
 *
 * Percentages were considered and rejected: `width: '40%'` fixes side-by-side
 * layout but does nothing for type, icons or tap targets, which is exactly where
 * a 320dp budget Android and a 430dp Pro Max actually diverge.
 *
 * The clamp is the whole point: raw width/BASELINE makes a large phone absurd,
 * so the ceiling is 1.10 — a modest, uniform lift rather than a stretched layout.
 *
 * The floor is 1.0 — this app never scales DOWN — and that is a deliberate
 * departure from the vendor app's 0.88 floor. Shrinking a 320dp phone by 12%
 * takes a 44dp tap target to 39dp, under both the iOS 44pt and Android 48dp
 * minimums, and 14px body text to 12px: it would have made small, cheap devices
 * strictly worse than they are today in order to make them "consistent".
 * Consistency here means the design holds its proportions, not that small phones
 * get a miniature of it.
 *
 * The real small-screen failure was never type size — it was fixed-width tiles
 * overflowing (two 168px cards do not fit in 320dp). That is fixed properly by
 * productGridCardWidth below, which derives tile widths from the actual window,
 * so the floor does not need to paper over it.
 */
// The clamp itself lives in utils/scaleStyles so it can be unit-tested without a
// React Native runtime; this module only supplies the real window width.
const SCALE = deviceScale(Dimensions.get('window').width);

/** Scale a design-baseline pixel value to this device. Rounds to a real pixel. */
export const s = (n: number): number => PixelRatio.roundToNearestPixel(n * SCALE);

/**
 * Cap for the OS font-size accessibility setting, applied by components/ui/ScaledText,
 * which every screen imports Text/TextInput from.
 *
 * 1 means the app ignores the OS font-size setting entirely: text renders at the
 * same size for everyone, which is what keeps every screen pixel-consistent across
 * devices. This matches the vendor app and is a deliberate product decision.
 *
 * The cost is real and worth restating before anyone "tidies" this away: a customer
 * who has enlarged their system font because they cannot comfortably read small text
 * gets no benefit from it anywhere in this app. If that ever needs undoing, raise
 * this value and give the dense screens (checkout, order detail, product detail)
 * room to wrap — they are the reason it is capped.
 */
export const MAX_FONT_SCALE = 1;

/**
 * Drop-in for StyleSheet.create that runs every measurement through s().
 *
 * THE ONE RULE: createStyles is the single scaling point. The size tokens below
 * (fontSize, space, gutter, radius, shadow) are deliberately left at the 390dp
 * design baseline and are NOT pre-scaled. Do not "helpfully" wrap them in s() —
 * 34 files mix `borderRadius: radius.md` with `padding: 14` in the same style
 * object, so pre-scaling the token would scale it twice while the raw number
 * scaled once, and the two would drift apart on exactly the small and large
 * devices this exists to keep consistent.
 *
 * Corollary: a measurement written OUTSIDE a stylesheet (an inline style object,
 * or a numeric prop like an icon `size=`) is not reached by createStyles — call
 * s() on it explicitly there.
 *
 * Every screen uses this instead of StyleSheet.create, so the ~460 hardcoded
 * font sizes and ~295 hardcoded box measurements scattered across the app scale
 * with the device without touching a single one of them — and anything written
 * later scales by default. Percent strings, 'auto' and colours pass through
 * untouched. Which properties count as measurements lives in utils/scaleStyles.
 */
export const createStyles = <T extends StyleSheet.NamedStyles<T>>(styles: T): T =>
  StyleSheet.create(scaleTree(styles, s) as T);

/* ============ PALETTE ============ */
export const palette = {
  // Signature ZPIN yellow
  yellow50: '#FFFBEB',
  yellow100: '#FFF3C4',
  yellow200: '#FFE988',
  yellow300: '#FFDD4D',
  yellow400: '#FFD11A',
  yellow500: '#FFC400', // primary brand
  yellow600: '#E7A900',
  yellow700: '#B37F00',
  yellow800: '#895E00',
  yellow900: '#654400',

  // Wordmark red
  red50: '#FBE9E9',
  red100: '#F5C9C9',
  red200: '#E89A9A',
  red300: '#D96363',
  red400: '#C43333',
  red500: '#AA0A0A',
  red600: '#8C0707',
  red700: '#6E0606',

  // Wordmark green
  green50: '#E7F1E6',
  green100: '#C7DEC4',
  green200: '#93BE8D',
  green300: '#5C9A54',
  green400: '#2E7A26',
  green500: '#0F5A08',
  green600: '#0C4A07',

  // Warm neutrals
  neutral0: '#FFFFFF',
  neutral50: '#FAFAF8',
  neutral100: '#F2F1EC',
  neutral200: '#E6E4DC',
  neutral300: '#CFCCC0',
  neutral400: '#A5A296',
  neutral500: '#767368',
  neutral600: '#545149',
  neutral700: '#3B3934',
  neutral800: '#24231F',
  neutral900: '#141311',
  ink: '#0E0D0B',

  paper: '#FFFFFF',
  paperWarm: '#FCFBF6',
  canvas: '#EDE9E0', // design canvas background behind screens

  // Semantic hues
  success500: '#12A150',
  success50: '#E6F5EC',
  warning500: '#E7860B',
  warning50: '#FDF1E1',
  danger500: '#E1341E',
  danger50: '#FBE7E3',
} as const;

/* ============ SEMANTIC COLOURS ============ */
export const colors = {
  // text
  textStrong: palette.ink,
  textBody: palette.neutral800,
  textMuted: palette.neutral500,
  textFaint: palette.neutral400,
  textInvert: palette.neutral0,
  textOnYellow: palette.ink,

  // surfaces
  surfacePage: palette.paper,
  surfaceCard: palette.neutral0,
  surfaceSunken: palette.neutral100,
  surfaceInverse: palette.ink,
  surfaceBrand: palette.yellow500,
  surfaceBrandTint: palette.yellow50,
  canvas: palette.canvas,

  // lines
  borderSubtle: palette.neutral200,
  borderStrong: palette.neutral300,
  borderInk: palette.ink,
  borderBrand: palette.yellow500,

  // brand states
  brand: palette.yellow500,
  brandHover: palette.yellow400,
  brandPress: palette.yellow600,
  brandTint: palette.yellow50,

  // accents
  accentRed: palette.red500,
  accentGreen: palette.green500,

  // ink button states
  inkHover: palette.neutral800,
  inkPress: palette.neutral900,

  focusRing: 'rgba(255, 196, 0, 0.45)',
} as const;

/* ============ TYPOGRAPHY ============ */
// Font family names map to @expo-google-fonts export identifiers.
export const fonts = {
  // Space Grotesk — display / numerals / prices
  displayRegular: 'SpaceGrotesk_400Regular',
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',

  // Hanken Grotesk — body / UI
  bodyRegular: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemiBold: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
  bodyBlack: 'HankenGrotesk_800ExtraBold',

  // Space Mono — eyebrows / codes / labels
  monoRegular: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

// px sizes from the design type scale, at the 390dp design baseline.
export const fontSize = {
  display: 56,
  h1: 40,
  h2: 30,
  h3: 22,
  lg: 18,
  base: 16,
  sm: 14,
  xs: 12,
  micro: 11,
} as const;

export const lineHeight = {
  tight: 1.05,
  snug: 1.2,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const tracking = {
  tight: -0.4, // ~ -0.02em on base
  normal: 0,
  wide: 0.6,
  label: 1.0, // uppercase mono eyebrow
} as const;

/* ============ SPACING (4px base) ============ */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const gutter = {
  page: 20, // app screen edge padding
  card: 16, // card interior padding
} as const;

/* ============ GRID METRICS ============ */
/**
 * Width of one card in the app's standard 2-up product grid.
 *
 * There were six different formulas for this — (width-40-14)/2, '48%', '47.5%',
 * (width-48)/2, (width/2)-20 and a hardcoded 168 — which agreed only at the 390dp
 * baseline and drifted apart on every other device; the loading skeleton never
 * matched the card it stood in for, so the grid visibly jumped when data arrived.
 * One derivation, used by the listing, search, for-you, flash-deals and skeleton
 * grids alike.
 *
 * Already derived from the real window width, so it is device-correct as-is and
 * must NOT be passed through createStyles — that would scale an already
 * proportional number a second time. Apply it inline or via a `width` prop.
 */
export const GRID_GAP = 14;
export const productGridCardWidth = Math.floor(
  (Dimensions.get('window').width - s(gutter.page) * 2 - GRID_GAP) / 2,
);


/* ============ RADII ============ */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14, // buttons, inputs
  lg: 20, // cards
  xl: 28, // sheets, hero tiles
  '2xl': 36,
  full: 999, // pill sentinel — "round the ends", not a measurement. Never scale.
} as const;

// Never scaled: a 1px rule is a hairline on every phone, and scaling it only
// makes it blurry or erases it. Matches the borderWidth exclusion in scaleStyles.
export const border = {
  hair: 1,
  thin: 1.5,
  bold: 2,
} as const;

/* ============ SHADOWS (iOS + Android elevation) ============ */
type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};
export const shadow: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'brand' | 'sheet', Shadow> = {
  xs: { shadowColor: '#141311', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: '#141311', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  md: { shadowColor: '#141311', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 5 },
  lg: { shadowColor: '#141311', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 10 },
  xl: { shadowColor: '#141311', shadowOffset: { width: 0, height: 28 }, shadowOpacity: 0.24, shadowRadius: 48, elevation: 16 },
  brand: { shadowColor: '#FFC400', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 8 },
  sheet: { shadowColor: '#141311', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 12 },
};

/* ============ MOTION ============ */
export const duration = { fast: 120, base: 200, slow: 320 } as const;

export const theme = {
  s,
  createStyles,
  palette,
  colors,
  fonts,
  fontSize,
  lineHeight,
  tracking,
  space,
  gutter,
  radius,
  border,
  shadow,
  duration,
};

export default theme;
