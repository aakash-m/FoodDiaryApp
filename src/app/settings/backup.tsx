import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { NavCard } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Dialog } from '@/components/ui/Sheet';
import { formatDate, todayKey } from '@/lib/dates';
import { backupInfo } from '@/mocks/diary';
import { updateSettings, useSettings } from '@/state/session';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Settings Sub-menu" (cards) mockup. Actions are mocked until Phase 6.

export default function BackupScreen() {
  const s = useSettings();
  const [lastBackup, setLastBackup] = useState(backupInfo.lastBackup);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const folder = s.backupFolder ?? backupInfo.folder;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Backup & restore" />
      <View style={styles.status}>
        <Icon name="check_circle" size={20} color={colors.sage} />
        <Text style={styles.statusText}>
          Automatic backup every 7 days · {backupInfo.files} backups, {backupInfo.sizeMb} MB
        </Text>
      </View>
      <View style={styles.cards}>
        <NavCard
          icon="backup"
          title="Back up now"
          subtitle={`Last backup ${formatDate(lastBackup)}`}
          onPress={() => setLastBackup(todayKey())}
        />
        <NavCard
          icon="folder"
          title="Backup folder"
          subtitle={folder}
          onPress={() => updateSettings({ backupFolder: 'Downloads/FoodDiary' })}
        />
        <NavCard
          icon="restore"
          title="Restore from backup"
          subtitle="Replaces all data on this phone"
          onPress={() => setConfirmRestore(true)}
        />
        <NavCard icon="pdf" title="Export all as PDF" subtitle="A readable archive of your whole diary" />
      </View>
      <Dialog
        visible={confirmRestore}
        title="Restore from backup?"
        message="All diary entries on this phone will be replaced. A safety backup of the current data is made first."
        onClose={() => setConfirmRestore(false)}
        actions={[{ label: 'Cancel' }, { label: 'Choose file', destructive: true }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.screen, marginTop: 6, marginBottom: 16 },
  statusText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  cards: { paddingHorizontal: spacing.screen, gap: 12 },
});
