import { ScrollView, StyleSheet, Text } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Select, type SelectOption } from '@/components/ui/Select';
import { updateSettings, useSettings } from '@/state/session';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Settings Sub-menu" (plain list) mockup.

const hours = (from: number, to: number): SelectOption[] =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const h = `${String(from + i).padStart(2, '0')}:00`;
    return { value: h, label: h };
  });

const EOD_TIMES: SelectOption[] = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'].map((t) => ({
  value: t,
  label: t,
}));

export default function RemindersScreen() {
  const s = useSettings();
  return (
    <ScrollView style={styles.screen}>
      <ScreenHeader title="Reminder times" />
      <Text style={styles.group}>Water reminder</Text>
      <ListRow
        icon="water"
        label="Remind me to drink water"
        value="Every 2 hours"
        toggle={{ value: s.waterReminder, onChange: (v) => updateSettings({ waterReminder: v }) }}
      />
      <Select variant="row" icon="time" label="Starts at" value={s.waterStart} options={hours(5, 12)} onChange={(v) => updateSettings({ waterStart: v })} />
      <Select variant="row" icon="time" label="Ends at" value={s.waterEnd} options={hours(18, 23)} onChange={(v) => updateSettings({ waterEnd: v })} />

      <Text style={styles.group}>End-of-day check</Text>
      <ListRow
        icon="moon"
        label="Tell me what's missing"
        value="Meals not logged or skipped, empty water or exercise"
        toggle={{ value: s.endOfDayReminder, onChange: (v) => updateSettings({ endOfDayReminder: v }) }}
      />
      <Select variant="row" icon="time" label="Check at" value={s.endOfDayTime} options={EOD_TIMES} onChange={(v) => updateSettings({ endOfDayTime: v })} />

      <Text style={styles.group}>Backup</Text>
      <ListRow
        icon="bell"
        label="Remind me when a backup is overdue"
        toggle={{ value: s.backupOverdueReminder, onChange: (v) => updateSettings({ backupOverdueReminder: v }) }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  group: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.sage,
    paddingHorizontal: spacing.screen + 4,
    marginTop: 18,
    marginBottom: 4,
  },
});
