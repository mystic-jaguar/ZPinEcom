import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { createStyles, colors } from '../../constants/theme';
import ZText from './ZText';

interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  /** Optional element rendered on the right (e.g. an action icon). */
  right?: React.ReactNode;
}

/** Back-chevron circle + Space Grotesk title, used across sub-screens. */
export default function AppHeader({ title, onBack, right }: AppHeaderProps) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
      >
        <ChevronLeft size={22} color={colors.textStrong} />
      </Pressable>
      {title ? (
        <ZText variant="h3" style={styles.title} numberOfLines={1}>
          {title}
        </ZText>
      ) : (
        <View style={styles.title} />
      )}
      {right ?? null}
    </View>
  );
}

const styles = createStyles({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
});
