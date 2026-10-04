import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
  useFonts,
} from '@expo-google-fonts/roboto';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { getAllPhotoFileNames } from '@/lib/db/diaryRepo';
import { DbProvider, useDb } from '@/lib/db/DbProvider';
import { cleanupOrphanPhotos } from '@/lib/photos';
import { SettingsProvider } from '@/state/settings';
import { colors, fonts, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <DbProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </DbProvider>
  );
}

/** Mounted once fonts, database and settings are ready, so the splash hides on a fully loaded screen. */
function AppShell() {
  const db = useDb();
  useEffect(() => {
    SplashScreen.hideAsync();
    // Remove photo files left behind if the app was killed while editing a meal.
    getAllPhotoFileNames(db)
      .then((names) => cleanupOrphanPhotos(names))
      .catch((e) => console.warn('Photo clean-up failed', e));
  }, [db]);
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
      <Button label="Try again" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', gap: 16, padding: spacing.screen + 8, backgroundColor: colors.background },
  errorTitle: { fontFamily: fonts.regular, fontSize: 24, color: colors.textPrimary },
  errorBody: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.textSecondary },
});
