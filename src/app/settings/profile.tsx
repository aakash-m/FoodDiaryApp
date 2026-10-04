import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { useSettings, useUpdateSettings } from '@/state/settings';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const updateSettings = useUpdateSettings();
  const [name, setName] = useState(s.name);
  const error = name.trim() ? undefined : 'Please enter your name';

  const [saveFailed, setSaveFailed] = useState(false);
  const save = async () => {
    if (error) return;
    if (await updateSettings({ name: name.trim() })) router.back();
    else setSaveFailed(true);
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Profile" trailing={<PillButton label="Save" onPress={save} disabled={!!error} />} />
      <View style={styles.body}>
        <TextField label="Your name" value={name} onChangeText={setName} error={error} maxLength={40} showCounter autoCapitalize="words" />
        <Text style={[styles.hint, saveFailed && { color: colors.error }]}>
          {saveFailed ? 'Could not save your name. Please try again.' : 'Shown in the header of your weekly report.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.screen, paddingTop: 16 },
  hint: { marginTop: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
});
