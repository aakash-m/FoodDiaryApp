import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts, spacing } from '@/theme/tokens';

type Props = {
  title: string;
  /** 'back' arrow (default), 'close' (×) for editors, or none. */
  leading?: 'back' | 'close' | 'none';
  onLeadingPress?: () => void;
  trailing?: ReactNode;
  centered?: boolean;
  tinted?: boolean;
};

export function ScreenHeader({ title, leading = 'back', onLeadingPress, trailing, centered, tinted }: Props) {
  const insets = useSafeAreaInsets();
  const icon: IconName = leading === 'close' ? 'close' : 'back';
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }, tinted && { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        {leading !== 'none' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={leading === 'close' ? 'Close' : 'Back'}
            hitSlop={10}
            onPress={onLeadingPress ?? (() => router.back())}
            style={styles.leading}
          >
            <Icon name={icon} size={26} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={[styles.title, centered && styles.titleCentered]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.trailing}>{trailing}</View>
      </View>
    </View>
  );
}

/** Large left-aligned page title, as on the tab screens (Settings, Daily goals). */
export function LargeTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.largeRow, { paddingTop: insets.top + 43 }]}>
      <Text style={styles.largeTitle}>{title}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, paddingBottom: 8 },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screen, gap: 14 },
  leading: { width: 30, alignItems: 'flex-start' },
  title: { flex: 1, fontFamily: fonts.regular, fontSize: 24, color: colors.textPrimary },
  titleCentered: { textAlign: 'center' },
  trailing: { minWidth: 30, alignItems: 'flex-end' },
  largeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    minHeight: 48,
  },
  largeTitle: { fontFamily: fonts.regular, fontSize: 36, color: colors.textPrimary },
});
