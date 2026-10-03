import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type NavCardProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  leading?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Tappable card row with a chevron (Calendar meal rows, Settings sub-menu cards). */
export function NavCard({ title, subtitle, icon, leading, onPress, style }: NavCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.navCard, pressed && styles.pressed, style]}
    >
      {leading}
      {icon && <Icon name={icon} size={24} color={colors.textSecondary} />}
      <View style={styles.navText}>
        <Text style={styles.navTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.navSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron_right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.cardPadding },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  pressed: { backgroundColor: colors.tabIndicator },
  navText: { flex: 1 },
  navTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.textPrimary },
  navSubtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
});
