import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius } from '../../constants/theme';
import ZText from './ZText';

interface ZInputProps extends TextInputProps {
  label?: string;
  icon?: LucideIcon;
  /** Enables the password show/hide eye toggle. */
  secure?: boolean;
  containerStyle?: any;
}

export default function ZInput({ label, icon: Icon, secure, containerStyle, style, ...rest }: ZInputProps) {
  const [hidden, setHidden] = useState(true);
  const EyeIcon = hidden ? EyeOff : Eye;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <ZText variant="eyebrow" color={colors.textBody} style={styles.label}>
          {label}
        </ZText>
      ) : null}
      <View style={styles.field}>
        {Icon ? <Icon size={19} color={colors.textFaint} /> : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          secureTextEntry={secure ? hidden : false}
          style={[styles.input, style]}
          {...rest}
        />
        {secure ? (
          <EyeIcon size={19} color={colors.textMuted} onPress={() => setHidden((h) => !h)} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    height: 54,
  },
  input: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textStrong,
    padding: 0,
  },
});
