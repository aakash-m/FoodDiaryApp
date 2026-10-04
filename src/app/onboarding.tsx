import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackupArt, RemindersArt, WelcomeArt } from '@/components/OnboardingArt';
import { Button } from '@/components/ui/Button';
import { PageDots } from '@/components/ui/Misc';
import { TextField } from '@/components/ui/TextField';
import { Icon } from '@/components/Icon';
import { pickBackupFolder } from '@/lib/backupFolder';
import { describeFolderUri } from '@/lib/folderLabel';
import { openAppSettings, requestNotificationAccess, type NotificationAccess } from '@/lib/notifications/permissions';
import { useSettings, useUpdateSettings } from '@/state/settings';
import { colors, fonts, spacing } from '@/theme/tokens';

const STEPS = 3;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const update = useUpdateSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.name);
  const [access, setAccess] = useState<NotificationAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Hardware back steps back through onboarding instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep((s) => s - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const finish = async () => {
    if (await update({ onboarded: true, onboardedAt: new Date().toISOString() })) router.replace('/');
  };

  const askNotifications = async () => {
    setBusy(true);
    try {
      const result = await requestNotificationAccess();
      setAccess(result);
      if (result === 'granted') setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const chooseFolder = async () => {
    setFolderError(null);
    setBusy(true);
    try {
      const picked = await pickBackupFolder();
      if (picked && !(await update({ backupDirUri: picked.uri }))) setFolderError('Could not save the folder. Please try again.');
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  let page: ReactNode;
  let actions: ReactNode;
  if (step === 0) {
    page = (
      <Page art={<WelcomeArt />} title="Welcome to Food Diary" tone="tinted">
        Log your meals, water and exercise every day and share a weekly report with your dietitian.
      </Page>
    );
    actions = (
      <>
        <TextField
          label="Your name"
          surfaceColor={colors.surfaceSubtle}
          value={name}
          onChangeText={setName}
          placeholder="Shown on your weekly report"
          autoCapitalize="words"
          returnKeyType="done"
          maxLength={40}
        />
        <Button
          label="Continue"
          disabled={!name.trim()}
          onPress={async () => {
            if (await update({ name: name.trim() })) setStep(1);
          }}
        />
      </>
    );
  } else if (step === 1) {
    page = (
      <Page art={<RemindersArt />} title="Stay on track" tone="hero">
        Get a reminder to drink water every 2 hours, and a nudge at {settings.endOfDayTime} if something is missing from your day.
      </Page>
    );
    actions =
      access === 'denied' || access === 'blocked' ? (
        <>
          <Text style={styles.notice}>
            Notifications are off, so reminders can&apos;t be shown. You can turn them on later in Settings.
          </Text>
          {access === 'blocked' ? (
            <Button label="Open phone settings" icon="settings" variant="secondary" onPress={openAppSettings} />
          ) : (
            <Button label="Try again" icon="bell" variant="secondary" onPress={askNotifications} disabled={busy} />
          )}
          <Button label="Continue" onPress={() => setStep(2)} />
        </>
      ) : (
        <>
          <Button label="Allow notifications" icon="bell" onPress={askNotifications} disabled={busy} />
          <Button label="Not now" variant="tertiary" onPress={() => setStep(2)} />
        </>
      );
  } else {
    page = (
      <Page art={<BackupArt />} title="Keep your diary safe" tone="plain">
        Choose a folder for automatic weekly backups. Your diary stays on this phone.
      </Page>
    );
    const folder = describeFolderUri(settings.backupDirUri);
    actions = folder ? (
      <>
        <View style={styles.folder}>
          <Icon name="check_circle" size={22} color={colors.sage} />
          <Text style={styles.folderText}>{folder}</Text>
        </View>
        <Button label="Get started" onPress={finish} />
        <Button label="Choose another folder" variant="tertiary" onPress={chooseFolder} disabled={busy} />
      </>
    ) : (
      <>
        {folderError ? (
          <Text style={[styles.notice, styles.error]}>{folderError}</Text>
        ) : (
          <Text style={styles.notice}>Tip: create a folder such as Documents/FoodDiary. Android doesn&apos;t allow the Download folder itself.</Text>
        )}
        <Button label="Choose backup folder" icon="folder" onPress={chooseFolder} disabled={busy} />
        <Button label="Skip for now" variant="tertiary" onPress={finish} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, step === 0 && { backgroundColor: colors.surfaceSubtle }]} behavior="height">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        {page}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <PageDots count={STEPS} active={step} />
          <View style={styles.actions}>{actions}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Page({ art, title, children, tone }: { art: ReactNode; title: string; children: ReactNode; tone: 'tinted' | 'hero' | 'plain' }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      {tone === 'hero' && <View style={[styles.hero, { height: 318 + insets.top }]} />}
      <View style={[styles.art, { paddingTop: insets.top + 56 }]}>{art}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  page: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.screen + 8, paddingBottom: 12 },
  hero: {
    position: 'absolute',
    top: 0,
    left: -120,
    right: -120,
    backgroundColor: colors.sageHero,
    borderBottomLeftRadius: 400,
    borderBottomRightRadius: 400,
  },
  art: { alignItems: 'center', paddingBottom: 36 },
  title: { fontFamily: fonts.regular, fontSize: 28, lineHeight: 34, color: colors.textPrimary, textAlign: 'center' },
  body: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: { paddingHorizontal: spacing.screen + 4, gap: 22, backgroundColor: 'transparent' },
  actions: { gap: 12 },
  folder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  folderText: { fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary },
  notice: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  error: { color: colors.error },
});
