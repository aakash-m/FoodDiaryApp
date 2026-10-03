import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackupArt, RemindersArt, WelcomeArt } from '@/components/OnboardingArt';
import { Button } from '@/components/ui/Button';
import { PageDots } from '@/components/ui/Misc';
import { TextField } from '@/components/ui/TextField';
import { Icon } from '@/components/Icon';
import { updateSettings, useSettings } from '@/state/session';
import { colors, fonts, spacing } from '@/theme/tokens';

const STEPS = 3;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const finish = () => {
    updateSettings({ onboarded: true });
    router.replace('/');
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
        <TextField label="Your name" surfaceColor={colors.surfaceSubtle} value={name} onChangeText={setName} placeholder="e.g. Anna" autoCapitalize="words" returnKeyType="done" />
        <Button
          label="Continue"
          disabled={!name.trim()}
          onPress={() => {
            updateSettings({ name: name.trim() });
            setStep(1);
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
    actions = (
      <>
        <Button
          label="Allow notifications"
          icon="bell"
          onPress={() => {
            updateSettings({ notificationsAllowed: true });
            setStep(2);
          }}
        />
        <Button label="Not now" variant="tertiary" onPress={() => setStep(2)} />
      </>
    );
  } else {
    page = (
      <Page art={<BackupArt />} title="Keep your diary safe" tone="plain">
        Choose a folder for automatic weekly backups. Your diary stays on this phone.
      </Page>
    );
    actions = settings.backupFolder ? (
      <>
        <View style={styles.folder}>
          <Icon name="check_circle" size={22} color={colors.sage} />
          <Text style={styles.folderText}>{settings.backupFolder}</Text>
        </View>
        <Button label="Get started" onPress={finish} />
      </>
    ) : (
      <>
        <Button label="Choose backup folder" icon="folder" onPress={() => updateSettings({ backupFolder: 'Downloads/FoodDiary' })} />
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
});
