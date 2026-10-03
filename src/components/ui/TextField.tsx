import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  maxLength?: number;
  showCounter?: boolean;
  disabled?: boolean;
  /** Background behind the field, so the notched label blends in on tinted screens. */
  surfaceColor?: string;
};

/** Outlined input with a notched label, error state and optional counter (design system "Input Fields"). */
export function TextField({ label, error, maxLength, showCounter, disabled, multiline, value, surfaceColor = colors.background, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.sage : colors.outline;
  return (
    <View>
      <View
        style={[
          styles.box,
          { backgroundColor: surfaceColor },
          { borderColor, borderWidth: focused || error ? 2 : 1 },
          error && { backgroundColor: colors.errorSurface },
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.label, { backgroundColor: surfaceColor }, { color: error ? colors.error : focused ? colors.sage : colors.textMuted }]}>
          {label}
        </Text>
        <TextInput
          {...rest}
          value={value}
          multiline={multiline}
          maxLength={maxLength}
          editable={!disabled}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textDisabled}
          cursorColor={colors.sage}
          selectionColor={colors.sageHover}
          style={[styles.input, multiline && styles.multiline]}
        />
      </View>
      {(error || showCounter) && (
        <View style={styles.helperRow}>
          <Text style={[styles.helper, { color: colors.error }]}>{error ?? ''}</Text>
          {showCounter && maxLength ? (
            <Text style={styles.helper}>
              {value?.length ?? 0}/{maxLength}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.field,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: colors.background,
  },
  disabled: { opacity: 0.5 },
  label: {
    position: 'absolute',
    top: -10,
    left: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.background,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  input: { fontFamily: fonts.regular, fontSize: 17, color: colors.textPrimary, paddingVertical: 6, minHeight: 36 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 },
  helper: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});
