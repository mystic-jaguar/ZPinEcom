import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, palette } from '../../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Background surface. Defaults to the warm paper the design uses on screens. */
  bg?: string;
  edges?: readonly Edge[];
  style?: ViewStyle;
}

/** Standard screen shell: warm paper background + safe-area top. */
export default function Screen({ children, bg = palette.paperWarm, edges = ['top'], style }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: bg }, style]}>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
});
