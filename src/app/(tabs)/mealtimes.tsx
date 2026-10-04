import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayItemCard } from '@/components/DayItemCard';
import { Icon } from '@/components/Icon';
import { MonthGrid, type DayMarker } from '@/components/MonthGrid';
import { Fab } from '@/components/ui/Fab';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { summarizeDay } from '@/lib/completeness';
import { getDay, getDaySummaries } from '@/lib/db/diaryRepo';
import { formatDate, fromKey, monthGrid, monthLabel, todayKey, weekdayName, type DateKey } from '@/lib/dates';
import { mealType } from '@/lib/meals';
import { photoUri } from '@/lib/photos';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Calendar" mockup: month grid with completion dots, then the selected day's 9 items (Day view in PLAN.md).

export default function MealtimesScreen() {
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const [selected, setSelected] = useState<DateKey>(today);
  const [view, setView] = useState(() => {
    const d = fromKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const dayQuery = useDiaryQuery((db) => getDay(db, selected), [selected]);
  const day = dayQuery.data;
  const summary = day ? summarizeDay(day) : null;
  const cells = monthGrid(view.year, view.month);
  const monthQuery = useDiaryQuery(
    (db) => getDaySummaries(db, cells[0].key, cells[cells.length - 1].key),
    [view.year, view.month],
  );
  const isFuture = (date: DateKey) => date > today;
  const currentMonth = fromKey(today);
  const atCurrentMonth = view.year === currentMonth.getFullYear() && view.month === currentMonth.getMonth();

  const shiftMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const marker = (date: DateKey): DayMarker => {
    const s = monthQuery.data?.get(date);
    if (!s || s.done === 0) return undefined;
    return s.missing === 0 ? 'complete' : 'partial';
  };

  const nextOpenMeal = day?.meals.find((m) => m.status === 'empty')?.type ?? 'breakfast';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Previous month" hitSlop={10} onPress={() => shiftMonth(-1)}>
          <Icon name="chevron_left" size={26} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.month}>{monthLabel(view.year, view.month)}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Next month"
            hitSlop={10}
            disabled={atCurrentMonth}
            onPress={() => shiftMonth(1)}
          >
            <Icon name="chevron_right" size={26} color={atCurrentMonth ? colors.disabled : colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityLabel="Go to today"
            hitSlop={10}
            onPress={() => {
              setSelected(today);
              setView({ year: currentMonth.getFullYear(), month: currentMonth.getMonth() });
            }}
          >
            <Icon name="today" size={24} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MonthGrid
          year={view.year}
          month={view.month}
          selected={selected}
          onSelect={setSelected}
          marker={marker}
          isDisabled={isFuture}
        />

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {weekdayName(selected)}, {formatDate(selected)}
          </Text>
          {summary && (
            <View style={[styles.donePill, summary.missing === 0 && styles.donePillComplete]}>
              <Text style={styles.donePillText}>
                {summary.done}/{summary.total} done
              </Text>
            </View>
          )}
        </View>

        {!day ? (
          <ActivityIndicator color={colors.sage} style={styles.loading} />
        ) : (
          <View style={styles.list}>
            {day.meals.map((m) => {
              const t = mealType(m.type);
              const photoCount = `${m.photos.length} ${m.photos.length === 1 ? 'photo' : 'photos'}`;
              const subtitle =
                m.status === 'logged'
                  ? `${t.time} · ${m.description || photoCount}`
                  : m.status === 'skipped'
                    ? `Skipped${m.skipReason ? ` — ${m.skipReason}` : ''}`
                    : `${t.time} · Not logged`;
              return (
                <DayItemCard
                  key={m.type}
                  title={t.label}
                  subtitle={subtitle}
                  state={m.status === 'logged' ? 'done' : m.status === 'skipped' ? 'skipped' : 'missing'}
                  photo={m.photos[0] ? { uri: photoUri(m.photos[0].fileName) } : undefined}
                  icon="restaurant"
                  onPress={() => router.push({ pathname: '/meal/[date]/[type]', params: { date: selected, type: m.type } })}
                />
              );
            })}
            <DayItemCard
              title="Water intake"
              subtitle={day.water || 'Not logged'}
              state={day.water ? 'done' : 'missing'}
              icon="water"
              onPress={() => router.push({ pathname: '/day/[date]/[field]', params: { date: selected, field: 'water' } })}
            />
            <DayItemCard
              title="Exercise"
              subtitle={day.exercise || 'Not logged'}
              state={day.exercise ? 'done' : 'missing'}
              icon="exercise"
              onPress={() => router.push({ pathname: '/day/[date]/[field]', params: { date: selected, field: 'exercise' } })}
            />
          </View>
        )}
      </ScrollView>

      <Fab
        label="Log a meal"
        onPress={() => router.push({ pathname: '/meal/[date]/[type]', params: { date: selected, type: nextOpenMeal } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingBottom: 10,
    gap: 12,
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.regular, fontSize: 24, color: colors.textPrimary },
  month: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  content: { paddingBottom: 100 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    marginTop: 14,
    marginBottom: 12,
  },
  dayTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary },
  donePill: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  donePillComplete: { backgroundColor: colors.tabIndicator },
  donePillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textPill },
  list: { paddingHorizontal: spacing.screen, gap: 10 },
  loading: { marginTop: 32 },
});
