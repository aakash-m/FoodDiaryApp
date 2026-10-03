import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme/tokens';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  progress: 'trending_up',
  mealtimes: 'restaurant',
  settings: 'settings',
};

export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]}>
              <Icon
                name={TAB_ICONS[route.name] ?? 'home'}
                size={26}
                color={focused ? colors.sageIcon : colors.textSecondary}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.tabBar,
    paddingHorizontal: 6,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
  },
  indicator: {
    width: 71,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    backgroundColor: colors.tabIndicator,
  },
  label: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textMuted,
  },
  labelActive: {
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
});
