import React from 'react';
import { View } from 'react-native';
import { createStyles, colors, fonts, palette } from '../../constants/theme';
import { Text } from './ScaledText';

const LABELS = ['ADDRESS', 'SUMMARY', 'PAYMENT'];

/** Three-segment checkout progress bar with mono step labels. step: 1|2|3 */
export default function CheckoutSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= step ? palette.yellow500 : colors.borderSubtle }]} />
        ))}
      </View>
      <View style={styles.labels}>
        {LABELS.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.label,
              { textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right', color: i + 1 === step ? colors.textStrong : colors.textFaint },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = createStyles({
  wrap: { paddingHorizontal: 20, paddingBottom: 16 },
  bars: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  labels: { flexDirection: 'row' },
  label: { flex: 1, fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.6 },
});
