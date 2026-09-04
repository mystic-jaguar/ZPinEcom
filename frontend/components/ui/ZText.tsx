import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { s as scale, colors, fonts, fontSize } from '../../constants/theme';
import { scaleTree } from '../../utils/scaleStyles';
import { Text } from './ScaledText';

/**
 * Typography primitive for the ZPIN design system.
 * Because each weight is a separate loaded font family, we map a semantic
 * `variant` to the correct fontFamily rather than using RN's `fontWeight`.
 */
export type ZTextVariant =
  | 'display'      // hero numerals
  | 'h1'
  | 'h2'
  | 'h3'
  | 'screenTitle' // big Space Grotesk screen heading ("Welcome back.")
  | 'lg'
  | 'body'
  | 'bodyStrong'
  | 'muted'
  | 'sm'
  | 'smStrong'
  | 'xs'
  | 'price'       // Space Grotesk numerals
  | 'eyebrow';    // mono uppercase label

const BASE: Record<ZTextVariant, any> = {
  display: { fontFamily: fonts.displayBold, fontSize: fontSize.display, color: colors.textStrong, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.displayBold, fontSize: fontSize.h1, color: colors.textStrong, letterSpacing: -1 },
  h2: { fontFamily: fonts.displayBold, fontSize: fontSize.h2, color: colors.textStrong, letterSpacing: -0.6 },
  h3: { fontFamily: fonts.displaySemiBold, fontSize: fontSize.h3, color: colors.textStrong, letterSpacing: -0.4 },
  screenTitle: { fontFamily: fonts.displayBold, fontSize: 34, color: colors.textStrong, letterSpacing: -1 },
  lg: { fontFamily: fonts.bodySemiBold, fontSize: fontSize.lg, color: colors.textStrong },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.textBody },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textStrong },
  muted: { fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.textMuted },
  sm: { fontFamily: fonts.bodyRegular, fontSize: fontSize.sm, color: colors.textBody },
  smStrong: { fontFamily: fonts.bodySemiBold, fontSize: fontSize.sm, color: colors.textStrong },
  xs: { fontFamily: fonts.bodyRegular, fontSize: fontSize.xs, color: colors.textMuted },
  price: { fontFamily: fonts.displayBold, fontSize: fontSize.lg, color: colors.textStrong, letterSpacing: -0.3 },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textFaint, letterSpacing: 1.4, textTransform: 'uppercase' },
};

export interface ZTextProps extends TextProps {
  variant?: ZTextVariant;
  color?: string;
}

export default function ZText({ variant = 'body', color, style, ...rest }: ZTextProps) {
  return <Text {...rest} style={[V[variant], color ? { color } : null, style]} />;
}

/**
 * Scaled once, here, rather than via createStyles: ZText applies `V[variant]` as a
 * plain style object (not through a StyleSheet), so it would otherwise be the one
 * place in the app that never followed the device. Scaling BASE once and using it
 * for both the inline object and the sheet keeps them a single source of truth and
 * avoids double-scaling.
 */
const V: Record<ZTextVariant, any> = scaleTree(BASE, scale);

export const zText = StyleSheet.create(V as any);
