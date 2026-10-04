import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { MonthGrid } from '@/components/MonthGrid';
import { PillButton } from '@/components/ui/Button';
import { BottomActions } from '@/components/ui/Misc';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  addDays,
  diffDays,
  formatDate,
  formatShortDate,
  fromKey,
  startOfIsoWeek,
  todayKey,
  weekLabel,
  weekdayName,
  type DateKey,
} from '@/lib/dates';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { summarizeDay } from '@/lib/completeness';
import { getDaySummaries } from '@/lib/db/diaryRepo';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

// "Meal Editor – Part 2" mockup mapped to the report range picker: start date + up to 7 day cards.

const MAX_DAYS = 7;

export default function ReportRangeScreen() {
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const [start, setStart] = useState<DateKey>(startOfIsoWeek(today));
  const [end, setEnd] = useState<DateKey>(minKey(addDays(startOfIsoWeek(today), MAX_DAYS - 1), today));
  const [picking, setPicking] = useState(false);

  const days = Array.from({ length: MAX_DAYS }, (_, i) => addDays(start, i));
  const summaries = useDiaryQuery((db) => getDaySummaries(db, start, addDays(start, MAX_DAYS - 1)), [start]);
  const isFuture = (d: DateKey) => d > today;
  const count = diffDays(start, end) + 1;

  const changeStart = (d: DateKey) => {
    setStart(d);
    setEnd(minKey(addDays(d, MAX_DAYS - 1), today));
    setPicking(false);
  };

  const preview = () => router.push({ pathname: '/report/preview', params: { start, end } });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Weekly report" trailing={<PillButton label="Preview" onPress={preview} />} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change start date"
          onPress={() => setPicking(true)}
          style={({ pressed }) => [styles.dateField, pressed && { backgroundColor: colors.tabIndicator }]}
        >
          <Icon name="calendar" size={22} color={colors.textSecondary} />
          <Text style={styles.dateLabel}>Starts</Text>
          <Text style={styles.dateValue}>{formatDate(start)}</Text>
          <Icon name="chevron_down" size={24} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.headingRow}>
          <Text style={styles.heading}>{weekLabel(start, end)}</Text>
          <Text style={styles.range}>
            {formatShortDate(start)} – {formatShortDate(end)} · {count} {count === 1 ? 'day' : 'days'}
          </Text>
        </View>
        <Text style={styles.hint}>Tap a day to end the report there.</Text>

        <View style={styles.grid}>
          {days.map((d) => {
            const future = isFuture(d);
            const included = d <= end;
            const s = summaries.data?.get(d) ?? summarizeDay({ meals: [], water: '', exercise: '' });
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: included, disabled: future }}
                disabled={future}
                onPress={() => setEnd(d)}
                style={({ pressed }) => [
                  styles.dayCard,
                  !included && styles.dayCardExcluded,
                  pressed && { backgroundColor: colors.tabIndicator },
                ]}
              >
                <View style={styles.dayCardTop}>
                  <Text style={[styles.dayName, !included && styles.mutedText]}>{weekdayName(d)}</Text>
                  {included && <Icon name="check_circle" size={18} color={colors.sage} />}
                </View>
                <Text style={[styles.dayMeta, !included && styles.mutedText]}>{formatDate(d)}</Text>
                <Text style={[styles.dayMeta, !included && styles.mutedText]}>
                  {future ? 'Upcoming' : `${s.done}/${s.total} done${s.missing ? ` · ${s.missing} missing` : ''}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <BottomActions onCancel={() => router.back()} onConfirm={preview} confirmLabel="Preview" bottomInset={insets.bottom} />

      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(false)}>
          <Pressable style={styles.dialog}>
            <Text style={styles.dialogTitle}>Report start date</Text>
            <StartPicker selected={start} onSelect={changeStart} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StartPicker({ selected, onSelect }: { selected: DateKey; onSelect: (d: DateKey) => void }) {
  const [view, setView] = useState(() => ({ year: fromKey(selected).getFullYear(), month: fromKey(selected).getMonth() }));
  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const monthName = new Date(view.year, view.month, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  return (
    <View>
      <View style={styles.monthRow}>
        <Pressable accessibilityLabel="Previous month" hitSlop={10} onPress={() => shift(-1)}>
          <Icon name="chevron_left" size={24} />
        </Pressable>
        <Text style={styles.monthName}>{monthName}</Text>
        <Pressable accessibilityLabel="Next month" hitSlop={10} onPress={() => shift(1)}>
          <Icon name="chevron_right" size={24} />
        </Pressable>
      </View>
      <MonthGrid year={view.year} month={view.month} selected={selected} onSelect={onSelect} isDisabled={(d) => d > todayKey()} tintedHeader={false} />
    </View>
  );
}

function minKey(a: DateKey, b: DateKey) {
  return a < b ? a : b;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
  },
  dateLabel: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
  dateValue: { flex: 1, fontFamily: fonts.medium, fontSize: 17, color: colors.textPrimary },
  headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22 },
  heading: { fontFamily: fonts.medium, fontSize: 22, color: colors.textPrimary },
  range: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  hint: { marginTop: 2, marginBottom: 14, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dayCard: { width: '47.8%', backgroundColor: colors.surface, borderRadius: radii.card, padding: 14, minHeight: 104 },
  dayCardExcluded: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.disabled },
  dayCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary },
  dayMeta: { marginTop: 3, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  mutedText: { color: colors.textDisabled },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,33,27,0.35)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: colors.background, borderRadius: 28, paddingVertical: 18 },
  dialogTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary, paddingHorizontal: 20, marginBottom: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 6 },
  monthName: { fontFamily: fonts.regular, fontSize: 16, color: colors.textPrimary },
});
