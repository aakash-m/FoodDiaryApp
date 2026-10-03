import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fromKey, monthGrid, todayKey, type DateKey } from '@/lib/dates';
import { colors, fonts } from '@/theme/tokens';

export type DayMarker = 'complete' | 'partial' | undefined;

type Props = {
  year: number;
  month: number;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
  marker?: (date: DateKey) => DayMarker;
  isDisabled?: (date: DateKey) => boolean;
  /** Tinted weekday header strip, as in the Calendar mockup. */
  tintedHeader?: boolean;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthGrid({ year, month, selected, onSelect, marker, isDisabled, tintedHeader = true }: Props) {
  const cells = monthGrid(year, month);
  const today = todayKey();
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return (
    <View>
      <View style={[styles.weekdays, tintedHeader && styles.weekdaysTinted]}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map(({ key, inMonth }) => {
            const disabled = isDisabled?.(key) ?? false;
            const isSelected = key === selected;
            const isToday = key === today;
            const m = inMonth ? marker?.(key) : undefined;
            return (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled }}
                accessibilityLabel={fromKey(key).toDateString()}
                style={styles.cell}
              >
                <View style={[styles.circle, isToday && !isSelected && styles.today, isSelected && styles.selected]}>
                  <Text
                    style={[
                      styles.day,
                      (!inMonth || disabled) && styles.dayMuted,
                      isSelected && styles.daySelected,
                    ]}
                  >
                    {fromKey(key).getDate()}
                  </Text>
                </View>
                <View style={[styles.marker, m === 'complete' && styles.markerComplete, m === 'partial' && styles.markerPartial]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdays: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8 },
  weekdaysTinted: { backgroundColor: colors.surface },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary },
  row: { flexDirection: 'row', paddingHorizontal: 8 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'hidden' },
  today: { backgroundColor: colors.surface },
  selected: { backgroundColor: colors.sageButton },
  day: { fontFamily: fonts.regular, fontSize: 16, color: colors.textPrimary },
  dayMuted: { color: colors.textDisabled },
  daySelected: { color: colors.white, fontFamily: fonts.medium },
  marker: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
  markerComplete: { backgroundColor: colors.sageDotActive },
  markerPartial: { backgroundColor: colors.amber },
});
