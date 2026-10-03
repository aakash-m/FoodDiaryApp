import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'tertiary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  size?: 'large' | 'small';
  style?: StyleProp<ViewStyle>;
};

// Buttons from the design system: Primary (filled sage), Secondary (outlined), Tertiary (text).
export function Button({ label, onPress, variant = 'primary', icon, disabled, size = 'large', style }: Props) {
  const textColor = disabled
    ? colors.textDisabled
    : variant === 'primary'
      ? colors.textOnSage
      : variant === 'secondary'
        ? colors.textSecondary
        : colors.sage;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'small' && styles.small,
        variant === 'primary' && { backgroundColor: pressed ? colors.sage : colors.sageButton },
        variant === 'secondary' && [styles.secondary, pressed && { backgroundColor: colors.surfaceSubtle }],
        variant === 'tertiary' && pressed && { backgroundColor: colors.surfaceSubtle },
        disabled && (variant === 'primary' ? styles.primaryDisabled : styles.otherDisabled),
        style,
      ]}
    >
      {icon && <Icon name={icon} size={size === 'small' ? 18 : 22} color={textColor} />}
      <Text style={[styles.label, size === 'small' && styles.labelSmall, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

/** Small pill action used in screen headers ("Save"). */
export function PillButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && { backgroundColor: colors.tabIndicator }]}
    >
      <Text style={[styles.pillText, disabled && { color: colors.textDisabled }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  small: { height: 40, borderRadius: 20, paddingHorizontal: 16 },
  secondary: { borderWidth: 1, borderColor: colors.outline, backgroundColor: 'transparent' },
  primaryDisabled: { backgroundColor: colors.disabled },
  otherDisabled: { borderColor: colors.disabled },
  label: { fontFamily: fonts.regular, fontSize: 18 },
  labelSmall: { fontSize: 16 },
  pill: {
    backgroundColor: colors.surfacePill,
    borderRadius: 999,
    height: 34,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  pillText: { fontFamily: fonts.medium, fontSize: 16, color: colors.textPill },
});
