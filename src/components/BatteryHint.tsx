import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { batteryGuidance } from '@/lib/batteryGuidance';
import { useSettings, useUpdateSettings } from '@/state/settings';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const PACKAGE = Constants.expoConfig?.android?.package ?? 'com.aakashmakhija.fooddiary';

/** Asks Android to exempt the app from battery optimisation (system dialog); falls back to app settings. */
async function requestUnrestricted(): Promise<void> {
  try {
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', { data: `package:${PACKAGE}` });
  } catch {
    await Linking.openSettings();
  }
}

/** Dismissible card for phones whose battery savers delay reminders (iQOO/vivo, Samsung, Xiaomi, …). */
export function BatteryHint() {
  const { batteryHintDismissed, waterReminder, endOfDayReminder } = useSettings();
  const update = useUpdateSettings();
  const guide = batteryGuidance(Device.manufacturer, Device.brand);
  if (!guide || batteryHintDismissed || !(waterReminder || endOfDayReminder)) return null;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.header}>
        <Icon name="bell" size={22} color={colors.sage} />
        <Text style={styles.title}>Make reminders reliable on {guide.brand}</Text>
      </View>
      <Text style={styles.body}>This phone may pause Food Diary in the background, which delays reminders. Allow it to run in the background:</Text>
      {guide.steps.map((step, i) => (
        <Text key={i} style={styles.step}>
          {i + 1}. {step}
        </Text>
      ))}
      <Text style={styles.note}>Menu names can differ slightly between versions.</Text>
      <View style={styles.actions}>
        <Button label="Done" variant="tertiary" size="small" onPress={() => void update({ batteryHintDismissed: true })} />
        <Button label="Allow in background" size="small" onPress={() => void requestUnrestricted()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.screen, marginTop: 16, padding: spacing.cardPadding, borderRadius: radii.card, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary },
  body: { marginTop: 8, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  step: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textPrimary },
  note: { marginTop: 8, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
