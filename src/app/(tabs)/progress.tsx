import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { NavCard, Card } from '@/components/ui/Card';
import { LargeTitle } from '@/components/ui/ScreenHeader';
import { Stat } from '@/components/ui/Misc';
import { LinearBar, ProgressRing } from '@/components/ui/Progress';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { summarizeDay, type DaySummary } from '@/lib/completeness';
import { getDaysInRange } from '@/lib/db/diaryRepo';
import { addDays, startOfIsoWeek, todayKey, weekLabel } from '@/lib/dates';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Daily goals" mockup mapped to diary completeness: today's n/9 ring plus this week's progress.

export default function ProgressScreen() {
  const today = todayKey();
  const weekStart = startOfIsoWeek(today);
  const query = useDiaryQuery((db) => getDaysInRange(db, weekStart, today), [weekStart, today]);
  const week: DaySummary[] = (query.data ?? []).map(summarizeDay);
  const s = week[week.length - 1] ?? summarizeDay({ meals: [], water: '', exercise: '' });
  const weekDone = week.reduce((n, d) => n + d.done, 0);
  const weekTotal = week.reduce((n, d) => n + d.total, 0);
  const completeDays = week.filter((d) => d.missing === 0).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LargeTitle title="Daily goals" />

      <View style={styles.stats}>
        <Stat value={String(s.logged)} label="Logged" />
        <Stat value={String(s.skipped)} label="Skipped" />
        <Stat value={String(s.missing)} label="Missing" />
      </View>

      <View style={styles.ring}>
        <ProgressRing progress={s.done / s.total} value={`${s.done}/${s.total}`} caption="Done today" />
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>This week</Text>
        <Text style={styles.cardSubtitle}>
          {weekLabel(weekStart, addDays(weekStart, 6))} · {completeDays} of {week.length} days complete
        </Text>
        <View style={{ marginTop: 14 }}>
          <LinearBar label="Items logged" progress={weekTotal ? weekDone / weekTotal : 0} trailing={`${weekDone}/${weekTotal}`} />
        </View>
      </Card>

      <NavCard
        style={styles.card}
        title="Weekly report"
        subtitle="Create the .docx for your dietitian"
        leading={<Icon name="calendar" size={24} color={colors.textSecondary} />}
        onPress={() => router.push('/report')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  stats: { flexDirection: 'row', marginTop: 24, paddingHorizontal: spacing.screen },
  ring: { alignItems: 'center', marginTop: 24, marginBottom: 28 },
  card: { marginHorizontal: spacing.screen, marginBottom: 14 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary },
  cardSubtitle: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
});
