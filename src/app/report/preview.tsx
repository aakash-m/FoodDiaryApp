import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart } from '@/components/BarChart';
import { Button, PillButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Misc';
import { LinearBar } from '@/components/ui/Progress';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Dialog, ProgressDialog } from '@/components/ui/Sheet';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { isFolderAccessible, pickBackupFolder } from '@/lib/backupFolder';
import { getDaysInRange } from '@/lib/db/diaryRepo';
import { useDb } from '@/lib/db/DbProvider';
import { isDateKey, startOfIsoWeek, todayKey, weekdayShort } from '@/lib/dates';
import { describeFolderUri } from '@/lib/folderLabel';
import { MEAL_TYPES } from '@/lib/meals';
import { generateReport, NoDocxViewerError, openReport, saveReportToFolder, shareReport, type GeneratedReport } from '@/lib/report/generate';
import { buildReportModel } from '@/lib/report/model';
import { useDiaryVersion } from '@/state/diaryEvents';
import { useSettings } from '@/state/settings';
import { strings } from '@/strings';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Weekly Report" mockup: summary of the range plus Open / Share / Save of the generated .docx.

type Notice = { title: string; message: string; shareInstead?: boolean };

export default function ReportPreviewScreen() {
  const insets = useSafeAreaInsets();
  const db = useDb();
  const version = useDiaryVersion();
  const { name, backupDirUri } = useSettings();
  const params = useLocalSearchParams<{ start: string; end: string }>();
  const start = params.start && isDateKey(params.start) ? params.start : startOfIsoWeek(todayKey());
  const end = params.end && isDateKey(params.end) && params.end >= start ? params.end : todayKey();
  const query = useDiaryQuery((d) => getDaysInRange(d, start, end), [start, end]);
  const model = query.data ? buildReportModel(name, query.data) : null;

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The generated file is reused for Open/Share/Save until the diary, range or name changes.
  const cache = useRef<{ key: string; report: GeneratedReport } | null>(null);

  const ensureReport = async (): Promise<GeneratedReport> => {
    const key = [version, start, end, name].join('|');
    if (cache.current?.key === key && cache.current.report.file.exists) return cache.current.report;
    setProgress({ done: 0, total: 0 });
    try {
      const report = await generateReport(db, name, start, end, (done, total) => setProgress({ done, total }));
      cache.current = { key, report };
      return report;
    } finally {
      setProgress(null);
    }
  };

  const run = async (action: (report: GeneratedReport) => Promise<void>) => {
    try {
      await action(await ensureReport());
    } catch (e) {
      if (e instanceof NoDocxViewerError) setNotice({ title: 'No Word viewer found', message: e.message, shareInstead: true });
      else setNotice({ title: 'Something went wrong', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const save = () =>
    run(async ({ file }) => {
      let folderUri = backupDirUri && isFolderAccessible(backupDirUri) ? backupDirUri : null;
      if (!folderUri) {
        const picked = await pickBackupFolder();
        if (!picked) return; // cancelled
        folderUri = picked.uri;
      }
      await saveReportToFolder(file, folderUri);
      setNotice({ title: 'Report saved', message: `${file.name} was saved to ${describeFolderUri(folderUri)}.` });
    });

  const days = model?.days ?? [];
  const waterDays = days.filter((d) => d.water !== strings.notLogged).length;
  const exerciseDays = days.filter((d) => d.exercise !== strings.notLogged).length;
  const busy = progress !== null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Weekly report" trailing={<PillButton label="Save" onPress={save} disabled={!model || busy} />} />
      {!model ? (
        <ActivityIndicator color={colors.sage} style={styles.loading} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.cardTitle}>Food Diary{model.name ? ` — ${model.name}` : ''}</Text>
            <Text style={styles.cardSubtitle}>
              {model.weekLabel} · {model.rangeLabel.replace(' to ', ' – ')}
            </Text>
            <View style={styles.tiles}>
              <Stat tile label="Meals logged" value={String(model.totals.logged)} />
              <Stat tile label="Skipped" value={String(model.totals.skipped)} />
              <Stat tile label="Missing" value={String(model.totals.missing)} />
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
                groups={days.map((d) => ({ label: weekdayShort(d.date), values: [d.summary.logged, d.summary.skipped] }))}
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Water & exercise</Text>
            <View style={styles.bars}>
              <LinearBar label="Water intake" progress={days.length ? waterDays / days.length : 0} trailing={`${waterDays}/${days.length} days`} />
              <LinearBar label="Exercise" progress={days.length ? exerciseDays / days.length : 0} trailing={`${exerciseDays}/${days.length} days`} />
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>In the document</Text>
            <Text style={styles.cardSubtitle}>
              {days.length} days · {model.totals.photos} photos · {model.fileName}
            </Text>
            <View style={styles.dayList}>
              {days.map((d) => (
                <View key={d.date} style={styles.dayRow}>
                  <Text style={styles.dayName}>{d.heading}</Text>
                  <Text style={[styles.dayDone, d.summary.missing > 0 && { color: colors.amber }]}>
                    {d.summary.done}/{d.summary.total}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </ScrollView>
      )}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 14 }]}>
        <Button label="Share" icon="share" variant="secondary" style={styles.action} disabled={!model || busy} onPress={() => run(({ file }) => shareReport(file))} />
        <Button label="Open .docx" icon="open" style={styles.action} disabled={!model || busy} onPress={() => run(({ file }) => openReport(file))} />
      </View>

      <ProgressDialog
        visible={busy}
        title="Creating report…"
        detail={progress && progress.total > 0 ? `Adding photos ${progress.done} of ${progress.total}` : 'Preparing the document'}
      />
      <Dialog
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message}
        onClose={() => setNotice(null)}
        actions={
          notice?.shareInstead
            ? [{ label: 'Close' }, { label: 'Share instead', primary: true, onPress: () => run(({ file }) => shareReport(file)) }]
            : [{ label: 'OK', primary: true }]
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  loading: { flex: 1 },
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
  dayDone: { fontFamily: fonts.medium, fontSize: 15, color: colors.sage },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: spacing.screen, paddingTop: 12 },
  action: { flex: 1 },
});
