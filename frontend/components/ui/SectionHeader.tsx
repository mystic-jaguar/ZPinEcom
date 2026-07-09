import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../constants/theme';
import ZText from './ZText';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: any;
}

/** Mono eyebrow + Space Grotesk title, optional "See all" action. */
export default function SectionHeader({ eyebrow, title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {eyebrow ? <ZText variant="eyebrow" style={styles.eyebrow}>{eyebrow}</ZText> : null}
        <ZText variant="h3" style={styles.title}>{title}</ZText>
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  left: { flex: 1 },
  eyebrow: { marginBottom: 3 },
  title: {},
  action: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.brandPress },
});
