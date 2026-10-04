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
import { DbProvider } from '@/lib/db/DbProvider';
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
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
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
