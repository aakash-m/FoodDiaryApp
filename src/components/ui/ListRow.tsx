import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts, spacing } from '@/theme/tokens';

type Props = {
  icon: IconName;
  label: string;
  value?: string;
  /** Renders a toggle on the right. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  /** 'chevron' (sub-page) or 'expand' (dropdown), ignored when toggle is set. */
  accessory?: 'chevron' | 'expand' | 'none';
  onPress?: () => void;
  disabled?: boolean;
};

/** Settings list row: icon, label, optional value and toggle/chevron, as in the Settings mockups. */
export function ListRow({ icon, label, value, toggle, accessory = 'chevron', onPress, disabled }: Props) {
  const content = (
    <>
      <Icon name={icon} size={22} color={disabled ? colors.textDisabled : colors.textMuted} />
      <View style={styles.text}>
        <Text style={[styles.label, disabled && { color: colors.textDisabled }]}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {toggle ? (
        <Toggle value={toggle.value} onChange={toggle.onChange} label={label} disabled={disabled} />
      ) : accessory === 'chevron' ? (
        <Icon name="chevron_right" size={20} color={colors.textMuted} />
      ) : accessory === 'expand' ? (
        <Icon name="chevron_down" size={24} color={colors.textMuted} />
      ) : null}
    </>
  );
  if (toggle && !onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceSubtle }]}
    >
      {content}
    </Pressable>
  );
}

export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: colors.sageHover, true: colors.sageButton }}
      thumbColor={colors.white}
      style={styles.switch}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: spacing.screen + 4,
  },
  text: { flex: 1, paddingVertical: 8 },
  label: { fontFamily: fonts.regular, fontSize: 17, color: colors.textPrimary },
  value: { marginTop: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  switch: { transform: [{ scaleX: 1.15 }, { scaleY: 1.15 }] },
});
