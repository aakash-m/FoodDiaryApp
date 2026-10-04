import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { NavCard } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Dialog } from '@/components/ui/Sheet';
import { isFolderAccessible, pickBackupFolder } from '@/lib/backupFolder';
import { formatDate, toKey } from '@/lib/dates';
import { describeFolderUri } from '@/lib/folderLabel';
import { useSettings, useUpdateSettings } from '@/state/settings';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Settings Sub-menu" (cards) mockup. Backup, restore and PDF export arrive in Phase 6.

type Notice = { title: string; message: string };

const LATER: Notice = {
  title: 'Coming soon',
  message: 'Backups, restore and PDF export arrive in a later update. Your diary is safe on this phone in the meantime.',
};

export default function BackupScreen() {
  const s = useSettings();
  const update = useUpdateSettings();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [accessible, setAccessible] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setAccessible(s.backupDirUri ? isFolderAccessible(s.backupDirUri) : true);
    }, [s.backupDirUri]),
  );

  const chooseFolder = async () => {
    try {
      const picked = await pickBackupFolder();
      if (!picked) return;
      if (await update({ backupDirUri: picked.uri })) setAccessible(true);
      else setNotice({ title: 'Folder not saved', message: 'Please try again.' });
    } catch (e) {
      setNotice({ title: 'Folder not usable', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const folder = describeFolderUri(s.backupDirUri);
  const status = !folder
    ? { ok: false, text: 'No backup folder chosen yet' }
    : !accessible
      ? { ok: false, text: 'The backup folder is no longer accessible. Please choose it again.' }
      : { ok: true, text: 'Automatic backup every 7 days' };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Backup & restore" />
      <View style={styles.status}>
        <Icon name={status.ok ? 'check_circle' : 'info'} size={20} color={status.ok ? colors.sage : colors.error} />
        <Text style={[styles.statusText, !status.ok && { color: colors.error }]}>{status.text}</Text>
      </View>
      <View style={styles.cards}>
        <NavCard
          icon="backup"
          title="Back up now"
          subtitle={s.lastBackupAt ? `Last backup ${formatDate(toKey(new Date(s.lastBackupAt)))}` : 'No backup yet'}
          onPress={() => setNotice(LATER)}
        />
        <NavCard icon="folder" title="Backup folder" subtitle={folder ?? 'Choose a folder, e.g. Documents/FoodDiary'} onPress={chooseFolder} />
        <NavCard icon="restore" title="Restore from backup" subtitle="Replaces all data on this phone" onPress={() => setNotice(LATER)} />
        <NavCard icon="pdf" title="Export all as PDF" subtitle="A readable archive of your whole diary" onPress={() => setNotice(LATER)} />
      </View>
      <Dialog
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message}
        onClose={() => setNotice(null)}
        actions={[{ label: 'OK', primary: true }]}
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
