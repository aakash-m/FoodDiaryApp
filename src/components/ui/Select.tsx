import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { colors, fonts, radii } from '@/theme/tokens';

export type SelectOption = { value: string; label: string; hint?: string };

type Props = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** 'field' (filled dropdown) or 'row' (settings list row with icon). */
  variant?: 'field' | 'row';
  icon?: IconName;
};

/** Filled dropdown field (Meal Editor "Selection") that opens a bottom sheet of options. */
export function Select({ label, value, options, onChange, variant = 'field', icon = 'time' }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.value === value);
  return (
    <>
      {variant === 'row' ? (
        <ListRow icon={icon} label={label} value={current?.label} accessory="expand" onPress={() => setOpen(true)} />
      ) : (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1}>
            {current?.label ?? 'Select'}
            {current?.hint ? <Text style={styles.hint}>{`  ${current.hint}`}</Text> : null}
          </Text>
          <Icon name="chevron_down" size={26} color={colors.textSecondary} />
        </View>
      </Pressable>
      )}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <ScrollView style={{ maxHeight: 520 }}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, (pressed || selected) && styles.optionActive]}
                >
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
                  <Text style={styles.optionLabel}>{o.label}</Text>
                  {o.hint ? <Text style={styles.optionHint}>{o.hint}</Text> : null}
                </Pressable>
              );
            })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderRadius: radii.field,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.textPrimary, paddingVertical: 4 },
  hint: { fontSize: 14, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,33,27,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 12 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.outline, marginTop: 10 },
  sheetTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary, padding: 12, paddingTop: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, height: 52, borderRadius: 14 },
  optionActive: { backgroundColor: colors.surface },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.sage },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sage },
  optionLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.textPrimary },
  optionHint: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
