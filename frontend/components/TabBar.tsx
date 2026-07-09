import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, LayoutGrid, LucideIcon, ShoppingCart, User } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, palette, shadow } from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: Home, label: 'Home' },
  categories: { icon: LayoutGrid, label: 'Shop' },
  cart: { icon: ShoppingCart, label: 'Cart' },
  profile: { icon: User, label: 'You' },
};

/** Floating dark pill tab bar with an expanding active item (ZPIN v2 design). */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(320, 'easeInEaseOut', 'opacity'));
  }, [state.index]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: 12 + insets.bottom }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const Icon = meta.icon;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabActive,
                pressed && { transform: [{ scale: 0.9 }] },
              ]}
            >
              <Icon size={20} color={focused ? colors.textOnYellow : '#8A877E'} />
              {focused ? <Text style={styles.label}>{meta.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceInverse,
    padding: 8,
    borderRadius: 100,
    ...shadow.lg,
  },
  tab: {
    height: 44,
    minWidth: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 0,
  },
  tabActive: {
    backgroundColor: palette.yellow500,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textOnYellow,
  },
});
