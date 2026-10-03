import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { LargeTitle } from '@/components/ui/ScreenHeader';
import { formatDate } from '@/lib/dates';
import { backupInfo } from '@/mocks/diary';
import { updateSettings, useSettings } from '@/state/session';
import { colors } from '@/theme/tokens';

// "Settings Main" mockup: icon rows with toggles and chevrons.

export default function SettingsScreen() {
  const s = useSettings();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LargeTitle title="Settings" />
      <View style={styles.list}>
        <ListRow icon="person" label="Profile" value={s.name} onPress={() => router.push('/settings/profile')} />
        <ListRow
          icon="water"
          label="Water reminder"
          value={s.waterReminder ? `Every 2 hours, ${s.waterStart}–${s.waterEnd}` : 'Off'}
          toggle={{ value: s.waterReminder, onChange: (v) => updateSettings({ waterReminder: v }) }}
        />
        <ListRow
          icon="moon"
          label="End-of-day reminder"
          value={s.endOfDayReminder ? `Checks your day at ${s.endOfDayTime}` : 'Off'}
          toggle={{ value: s.endOfDayReminder, onChange: (v) => updateSettings({ endOfDayReminder: v }) }}
        />
        <ListRow icon="time" label="Reminder times" onPress={() => router.push('/settings/reminders')} />
        <ListRow
          icon="backup"
          label="Backup & restore"
          value={`Last backup ${formatDate(backupInfo.lastBackup)}`}
          onPress={() => router.push('/settings/backup')}
        />
        <ListRow icon="info" label="About" value="Food Diary 1.0.0" accessory="none" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  list: { marginTop: 20 },
});
