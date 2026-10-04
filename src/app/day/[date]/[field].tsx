import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/ui/Button';
import { BottomActions } from '@/components/ui/Misc';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Dialog } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { getDay, MAX_DAY_TEXT_LENGTH, type DayTextField } from '@/lib/db/diaryRepo';
import { formatDate, isDateKey, todayKey, weekdayName } from '@/lib/dates';
import { useDiaryActions } from '@/state/diaryActions';
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
  const params = useLocalSearchParams<{ date: string; field: string }>();
  const date = params.date && isDateKey(params.date) ? params.date : todayKey();
  const field: DayTextField = params.field === 'exercise' ? 'exercise' : 'water';
  const day = useDiaryQuery((db) => getDay(db, date), [date]);

  if (!day.data) {
    return (
      <View style={[styles.screen, styles.center]}>
        {day.error ? <Text style={styles.contextText}>{day.error.message}</Text> : <ActivityIndicator color={colors.sage} />}
      </View>
    );
  }
  return <FieldEditor date={date} field={field} initial={day.data[field]} />;
}

function FieldEditor({ date, field, initial }: { date: string; field: DayTextField; initial: string }) {
  const insets = useSafeAreaInsets();
  const actions = useDiaryActions();
  const c = CONFIG[field];
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState<'discard' | { error: string } | null>(null);
  const dirty = text.trim() !== initial.trim();

  const requestClose = () => (dirty ? setPrompt('discard') : router.back());
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  });

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await actions.saveDayText(date, field, text);
      router.back();
    } catch (e) {
      setPrompt({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="height">
      <ScreenHeader title={c.title} leading="close" onLeadingPress={requestClose} trailing={<PillButton label="Save" onPress={save} disabled={saving} />} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.context}>
          <Icon name={c.icon} size={20} color={colors.sage} />
          <Text style={styles.contextText}>
            {weekdayName(date)}, {formatDate(date)}
          </Text>
        </View>
        <TextField label={c.label} placeholder={c.placeholder} value={text} onChangeText={setText} multiline maxLength={MAX_DAY_TEXT_LENGTH} showCounter />
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
      <BottomActions onCancel={requestClose} onConfirm={save} confirmLabel={saving ? 'Saving…' : 'Save'} bottomInset={insets.bottom} />
      <Dialog
        visible={!!prompt}
        title={prompt === 'discard' ? 'Discard changes?' : 'Something went wrong'}
        message={prompt === 'discard' ? 'Your changes will be lost.' : prompt?.error}
        onClose={() => setPrompt(null)}
        actions={
          prompt === 'discard'
            ? [{ label: 'Keep editing' }, { label: 'Discard', destructive: true, onPress: () => router.back() }]
            : [{ label: 'OK', primary: true }]
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.screen },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  contextText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textPill },
});
