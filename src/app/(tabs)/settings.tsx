import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { LargeTitle } from '@/components/ui/ScreenHeader';
import { useNotificationAccess } from '@/hooks/useNotificationAccess';
import { formatDate, toKey } from '@/lib/dates';
import { openAppSettings, requestNotificationAccess } from '@/lib/notifications/permissions';
import { useSettings, useUpdateSettings } from '@/state/settings';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

// "Settings Main" mockup: icon rows with toggles and chevrons.

export default function SettingsScreen() {
  const s = useSettings();
  const update = useUpdateSettings();
  const access = useNotificationAccess();
  const remindersOn = s.waterReminder || s.endOfDayReminder;
  const notificationsOff = remindersOn && (access === 'denied' || access === 'blocked' || access === 'undetermined');
  const lastBackup = s.lastBackupAt ? `Last backup ${formatDate(toKey(new Date(s.lastBackupAt)))}` : 'No backup yet';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LargeTitle title="Settings" />
      {notificationsOff && (
        <Pressable
          accessibilityRole="button"
          onPress={() => (access === 'blocked' ? openAppSettings() : requestNotificationAccess())}
          style={styles.warning}
        >
          <Icon name="bell" size={22} color={colors.error} />
          <Text style={styles.warningText}>
            Notifications are off, so reminders won&apos;t appear. Tap to {access === 'blocked' ? 'open phone settings' : 'allow them'}.
          </Text>
        </Pressable>
      )}
      <View style={styles.list}>
        <ListRow icon="person" label="Profile" value={s.name || 'Add your name'} onPress={() => router.push('/settings/profile')} />
        <ListRow
          icon="water"
          label="Water reminder"
          value={s.waterReminder ? `Every 2 hours, ${s.waterStart}–${s.waterEnd}` : 'Off'}
          toggle={{ value: s.waterReminder, onChange: (v) => update({ waterReminder: v }) }}
        />
        <ListRow
          icon="moon"
          label="End-of-day reminder"
          value={s.endOfDayReminder ? `Checks your day at ${s.endOfDayTime}` : 'Off'}
          toggle={{ value: s.endOfDayReminder, onChange: (v) => update({ endOfDayReminder: v }) }}
        />
        <ListRow icon="time" label="Reminder times" onPress={() => router.push('/settings/reminders')} />
        <ListRow icon="backup" label="Backup & restore" value={lastBackup} onPress={() => router.push('/settings/backup')} />
        <ListRow icon="info" label="About" value="Food Diary 1.0.0" accessory="none" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  list: { marginTop: 20 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginHorizontal: spacing.screen,
    padding: 14,
    borderRadius: radii.field,
    backgroundColor: colors.errorSurface,
  },
  warningText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textPrimary },
});
