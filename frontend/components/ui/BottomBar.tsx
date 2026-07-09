import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

/** Sticky bottom action bar (white, hairline top border) for CTA buttons. */
export default function BottomBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSunken,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
});
