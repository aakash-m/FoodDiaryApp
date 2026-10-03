import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart } from '@/components/BarChart';
import { Button, PillButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Misc';
import { LinearBar } from '@/components/ui/Progress';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Dialog } from '@/components/ui/Sheet';
import { addDays, diffDays, formatDate, startOfIsoWeek, todayKey, weekLabel, weekdayName, weekdayShort } from '@/lib/dates';
import { MEAL_TYPES } from '@/lib/meals';
import { getDay, summarize } from '@/mocks/diary';
import { useSettings } from '@/state/session';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Weekly Report" mockup mapped to the report preview. .docx generation is mocked until Phase 4.

export default function ReportPreviewScreen() {
  const insets = useSafeAreaInsets();
  const { name, backupFolder } = useSettings();
  const params = useLocalSearchParams<{ start: string; end: string }>();
  const start = params.start ?? startOfIsoWeek(todayKey());
  const end = params.end ?? todayKey();
  const dates = Array.from({ length: diffDays(start, end) + 1 }, (_, i) => addDays(start, i));
  const days = dates.map((d) => ({ date: d, day: getDay(d), s: summarize(getDay(d)) }));

  const totals = days.reduce(
    (t, { s }) => ({ logged: t.logged + s.logged, skipped: t.skipped + s.skipped, missing: t.missing + s.missing }),
    { logged: 0, skipped: 0, missing: 0 },
  );
  const waterDays = days.filter(({ day }) => day.water.trim()).length;
  const exerciseDays = days.filter(({ day }) => day.exercise.trim()).length;
  const photos = days.reduce((n, { day }) => n + day.meals.reduce((m, meal) => m + meal.photos.length, 0), 0);
  const fileName = `FoodDiary_${name}_${start}_${end}.docx`;
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Weekly report"
        trailing={
          <PillButton
            label="Save"
            onPress={() => setNotice({ title: 'Report saved', message: `${fileName} was saved to ${backupFolder ?? 'Downloads/FoodDiary'}.` })}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.cardTitle}>Food Diary — {name}</Text>
          <Text style={styles.cardSubtitle}>
            {weekLabel(start, end)} · {formatDate(start)} – {formatDate(end)}
          </Text>
          <View style={styles.tiles}>
            <Stat tile label="Meals logged" value={String(totals.logged)} />
            <Stat tile label="Skipped" value={String(totals.skipped)} />
            <Stat tile label="Missing" value={String(totals.missing)} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Meals per day</Text>
          <View style={{ marginTop: 14 }}>
            <BarChart
              max={MEAL_TYPES.length}
              ticks={[0, 2, 4, 6]}
              series={[
                { name: 'Logged', color: colors.sageButton },
                { name: 'Skipped', color: colors.amberSoft },
              ]}
              groups={days.map(({ date, s }) => ({ label: weekdayShort(date), values: [s.logged, s.skipped] }))}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Water & exercise</Text>
          <View style={styles.bars}>
            <LinearBar label="Water intake" progress={waterDays / days.length} trailing={`${waterDays}/${days.length} days`} />
            <LinearBar label="Exercise" progress={exerciseDays / days.length} trailing={`${exerciseDays}/${days.length} days`} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>In the document</Text>
          <Text style={styles.cardSubtitle}>
            {days.length} days · {photos} photos · {fileName}
          </Text>
          <View style={styles.dayList}>
            {days.map(({ date, s }) => (
              <View key={date} style={styles.dayRow}>
                <Text style={styles.dayName}>
                  {weekdayName(date)} <Text style={styles.dayDate}>{formatDate(date)}</Text>
                </Text>
                <Text style={[styles.dayDone, s.missing > 0 && { color: colors.amber }]}>
                  {s.done}/{s.total}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          label="Share"
          icon="share"
          variant="secondary"
          style={styles.action}
          onPress={() => setNotice({ title: 'Share report', message: `Opens the Android share sheet for ${fileName} (WhatsApp, email…).` })}
        />
        <Button
          label="Open .docx"
          icon="open"
          style={styles.action}
          onPress={() => setNotice({ title: 'Open report', message: `Opens ${fileName} in Word, Google Docs or another .docx viewer.` })}
        />
      </View>
      <Dialog
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message}
        onClose={() => setNotice(null)}
        actions={[{ label: 'OK', primary: true }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  card: { marginTop: 14 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary },
  cardSubtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  bars: { gap: 16, marginTop: 14 },
  dayList: { marginTop: 10 },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },
  dayName: { fontFamily: fonts.medium, fontSize: 15, color: colors.textPrimary },
  dayDate: { fontFamily: fonts.regular, color: colors.textSecondary },
  dayDone: { fontFamily: fonts.medium, fontSize: 15, color: colors.sage },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: spacing.screen, paddingTop: 12 },
  action: { flex: 1 },
});
