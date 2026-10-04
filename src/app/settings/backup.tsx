import type { File } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { NavCard } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Dialog, ProgressDialog } from '@/components/ui/Sheet';
import { backupFolderStats, pickBackupFile, type BackupFolderStats } from '@/lib/backup/archive';
import { exportAllAsPdf, sharePdf } from '@/lib/backup/pdf';
import { isFolderAccessible, pickBackupFolder } from '@/lib/backupFolder';
import { formatBytes } from '@/lib/bytes';
import { useDb } from '@/lib/db/DbProvider';
import { formatDate, toKey } from '@/lib/dates';
import { describeFolderUri } from '@/lib/folderLabel';
import { saveReportToFolder } from '@/lib/report/generate';
import { NoBackupFolderError, useBackupActions } from '@/state/backupActions';
import { useSettings, useUpdateSettings } from '@/state/settings';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Settings Sub-menu" (cards) mockup: back up, folder, restore, PDF export (PLAN.md §5).

type Notice = { title: string; message: string; actions?: { label: string; primary?: boolean; destructive?: boolean; onPress?: () => void }[] };
type Busy = { title: string; detail?: string };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function BackupScreen() {
  const db = useDb();
  const s = useSettings();
  const update = useUpdateSettings();
  const { backupNow, restore } = useBackupActions();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [accessible, setAccessible] = useState(true);
  const [stats, setStats] = useState<BackupFolderStats | null>(null);

  const refresh = useCallback(() => {
    const ok = s.backupDirUri ? isFolderAccessible(s.backupDirUri) : true;
    setAccessible(ok);
    try {
      setStats(s.backupDirUri && ok ? backupFolderStats(s.backupDirUri) : null);
    } catch {
      setStats(null);
    }
    // lastBackupAt: an automatic backup may finish while this screen is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.backupDirUri, s.lastBackupAt]);
  useFocusEffect(refresh);

  const chooseFolder = async () => {
    try {
      const picked = await pickBackupFolder();
      if (!picked) return;
      if (await update({ backupDirUri: picked.uri })) {
        setAccessible(true);
        setStats(backupFolderStats(picked.uri));
      } else setNotice({ title: 'Folder not saved', message: 'Please try again.' });
    } catch (e) {
      setNotice({ title: 'Folder not usable', message: errorText(e) });
    }
  };

  const runBackup = async () => {
    setBusy({ title: 'Backing up…' });
    try {
      const r = await backupNow((done, total) => setBusy({ title: 'Backing up…', detail: total ? `Adding photo ${done} of ${total}` : undefined }));
      refresh();
      setNotice({
        title: 'Backup saved',
        message: `${r.fileName} (${formatBytes(r.sizeBytes)}) was saved to ${describeFolderUri(s.backupDirUri)}.${r.missingPhotos ? ` ${r.missingPhotos} photo files were missing and were skipped.` : ''}`,
      });
    } catch (e) {
      if (e instanceof NoBackupFolderError) {
        setNotice({ title: 'Choose a backup folder', message: e.message, actions: [{ label: 'Cancel' }, { label: 'Choose folder', primary: true, onPress: chooseFolder }] });
      } else setNotice({ title: 'Backup failed', message: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const runRestore = async () => {
    let file: File | null;
    try {
      file = await pickBackupFile(s.backupDirUri);
    } catch (e) {
      setNotice({ title: 'Could not open the file', message: errorText(e) });
      return;
    }
    if (!file) return;
    setBusy({ title: 'Restoring…' });
    try {
      const r = await restore(file, (phase, done, total) =>
        setBusy({
          title: phase === 'safety' ? 'Saving a safety backup…' : 'Restoring…',
          detail: total ? (phase === 'safety' ? `Photo ${done} of ${total}` : `${Math.round((done / total) * 100)} %`) : undefined,
        }),
      );
      refresh();
      setNotice({
        title: 'Diary restored',
        message: `Restored ${plural(r.days, 'day')}, ${plural(r.meals, 'meal')} and ${plural(r.photos, 'photo')}.${r.safetyBackup ? ` Your previous diary was saved first as ${r.safetyBackup.fileName}.` : ''}`,
      });
    } catch (e) {
      setNotice({ title: 'Restore failed', message: `${errorText(e)} Your current diary has not been changed.` });
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = () =>
    setNotice({
      title: 'Restore from backup?',
      message: 'All diary entries on this phone will be replaced by the backup. If a backup folder is set, a safety backup of the current diary is saved first.',
      actions: [{ label: 'Cancel' }, { label: 'Choose backup', destructive: true, onPress: () => void runRestore() }],
    });

  const runPdf = async () => {
    setBusy({ title: 'Creating PDF…' });
    try {
      const pdf = await exportAllAsPdf(db, s.name, (done, total) => setBusy({ title: 'Creating PDF…', detail: total ? `Preparing photo ${done} of ${total}` : undefined }));
      const folderOk = s.backupDirUri && isFolderAccessible(s.backupDirUri);
      setNotice({
        title: 'PDF ready',
        message: `${pdf.name} (${formatBytes(pdf.size)})`,
        actions: [
          { label: 'Share', onPress: () => void sharePdf(pdf).catch((e) => setNotice({ title: 'Share failed', message: errorText(e) })) },
          ...(folderOk
            ? [
                {
                  label: 'Save to folder',
                  primary: true,
                  onPress: () =>
                    void saveReportToFolder(pdf, s.backupDirUri!)
                      .then(() => setNotice({ title: 'PDF saved', message: `${pdf.name} was saved to ${describeFolderUri(s.backupDirUri)}.` }))
                      .catch((e) => setNotice({ title: 'Save failed', message: errorText(e) })),
                },
              ]
            : []),
        ],
      });
    } catch (e) {
      setNotice({ title: 'PDF export failed', message: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const folder = describeFolderUri(s.backupDirUri);
  const status = !folder
    ? { ok: false, text: 'No backup folder chosen yet. Choose one so your diary is backed up automatically.' }
    : !accessible
      ? { ok: false, text: 'The backup folder is no longer accessible. Please choose it again.' }
      : { ok: true, text: `Automatic backup every 7 days${stats ? ` · ${stats.count} ${stats.count === 1 ? 'backup' : 'backups'}, ${formatBytes(stats.sizeBytes)}` : ''}` };

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
          onPress={runBackup}
        />
        <NavCard icon="folder" title="Backup folder" subtitle={folder ?? 'Choose a folder, e.g. Documents/FoodDiary'} onPress={chooseFolder} />
        <NavCard icon="restore" title="Restore from backup" subtitle="Replaces all data on this phone" onPress={confirmRestore} />
        <NavCard icon="pdf" title="Export all as PDF" subtitle="A readable archive of your whole diary" onPress={runPdf} />
      </View>
      {stats && stats.sizeBytes > 1024 * 1024 * 1024 && (
        <Text style={styles.hint}>Old backups use {formatBytes(stats.sizeBytes)}. You can delete older ones in the Files app; keep at least the newest.</Text>
      )}
      <ProgressDialog visible={!!busy} title={busy?.title ?? ''} detail={busy?.detail} />
      <Dialog
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message}
        onClose={() => setNotice(null)}
        actions={notice?.actions ?? [{ label: 'OK', primary: true }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.screen, marginTop: 6, marginBottom: 16 },
  statusText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  cards: { paddingHorizontal: spacing.screen, gap: 12 },
  hint: { marginTop: 14, paddingHorizontal: spacing.screen, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
});
