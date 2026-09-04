import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, View, ViewStyle } from 'react-native';
import { createStyles, colors, fonts, shadow } from '../../constants/theme';
import { Text } from './ScaledText';

export type ZButtonVariant = 'primary' | 'ink' | 'outline' | 'light' | 'red';
export type ZButtonSize = 'lg' | 'md' | 'sm';

interface ZButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ZButtonVariant;
  size?: ZButtonSize;
  icon?: LucideIcon; // trailing icon (design uses arrow-right on primary CTAs)
  iconLeft?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const HEIGHT: Record<ZButtonSize, number> = { lg: 56, md: 48, sm: 40 };
const FS: Record<ZButtonSize, number> = { lg: 16, md: 15, sm: 14 };

function palette(variant: ZButtonVariant) {
  switch (variant) {
    case 'ink':
      return { bg: colors.surfaceInverse, fg: colors.textInvert, border: 'transparent' };
    case 'outline':
      return { bg: colors.surfaceCard, fg: colors.textStrong, border: colors.borderSubtle };
    case 'light':
      return { bg: colors.surfaceSunken, fg: colors.textStrong, border: 'transparent' };
    case 'red':
      return { bg: colors.accentRed, fg: colors.textInvert, border: 'transparent' };
    case 'primary':
    default:
      return { bg: colors.brand, fg: colors.textOnYellow, border: 'transparent' };
  }
}

export default function ZButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  iconLeft: IconLeft,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ZButtonProps) {
  const p = palette(variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          backgroundColor: p.bg,
          borderColor: p.border,
          borderWidth: variant === 'outline' ? 2 : 0,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? undefined : 'flex-start',
          paddingHorizontal: fullWidth ? 16 : 22,
        },
        variant === 'primary' ? shadow.brand : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {IconLeft ? <IconLeft size={18} color={p.fg} /> : null}
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: FS[size], color: p.fg }}>{label}</Text>
          {Icon ? <Icon size={18} color={p.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = createStyles({
  base: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  disabled: { opacity: 0.5 },
});
