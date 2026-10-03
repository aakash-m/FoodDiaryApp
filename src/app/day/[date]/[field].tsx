import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/ui/Button';
import { BottomActions } from '@/components/ui/Misc';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { formatDate, todayKey, weekdayName } from '@/lib/dates';
import { getDay } from '@/mocks/diary';
import { colors, fonts, spacing } from '@/theme/tokens';

// Free-text Water Intake / Exercise editor for a day.

const CONFIG = {
  water: {
    title: 'Water intake',
    icon: 'water',
    label: 'Water intake',
    placeholder: 'e.g. 2 litres',
    suggestions: ['1 litre', '1.5 litres', '2 litres', '8 glasses'],
  },
  exercise: {
    title: 'Exercise',
    icon: 'exercise',
    label: 'Exercise',
    placeholder: 'e.g. 30 min brisk walk',
    suggestions: ['30 min walk', '45 min yoga', '20 min cycling', 'Rest day'],
  },
} as const;

export default function DayFieldScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string; field: string }>();
  const date = params.date ?? todayKey();
  const field = params.field === 'exercise' ? 'exercise' : 'water';
  const c = CONFIG[field];
  const [text, setText] = useState(getDay(date)[field]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="height">
      <ScreenHeader title={c.title} leading="close" trailing={<PillButton label="Save" onPress={() => router.back()} />} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.context}>
          <Icon name={c.icon} size={20} color={colors.sage} />
          <Text style={styles.contextText}>
            {weekdayName(date)}, {formatDate(date)}
          </Text>
        </View>
        <TextField label={c.label} placeholder={c.placeholder} value={text} onChangeText={setText} multiline maxLength={200} showCounter />
        <View style={styles.chips}>
          {c.suggestions.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => setText(s)}
              style={({ pressed }) => [styles.chip, pressed && { backgroundColor: colors.tabIndicator }]}
            >
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomActions onCancel={() => router.back()} onConfirm={() => router.back()} bottomInset={insets.bottom} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  contextText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textPill },
});
