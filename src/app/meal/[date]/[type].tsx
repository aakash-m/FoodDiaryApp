import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_PHOTOS, PhotoGrid } from '@/components/PhotoGrid';
import { PillButton } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/ListRow';
import { BottomActions } from '@/components/ui/Misc';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Select } from '@/components/ui/Select';
import { ActionSheet, Dialog } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { formatDate, todayKey, weekdayName } from '@/lib/dates';
import { MEAL_TYPES, isMealTypeKey, mealType, type MealTypeKey } from '@/lib/meals';
import { getDay } from '@/mocks/diary';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Meal Editor – Part 1" mockup. Saving and photo picking are mocked until Phase 3.

const MOCK_PICKS: ImageSourcePropType[] = [require('@/assets/images/mock/meal-1.jpg'), require('@/assets/images/mock/meal-2.jpg')];

const MEAL_OPTIONS = MEAL_TYPES.map((m) => ({ value: m.key, label: m.label, hint: m.time }));

export default function MealEditorScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string; type: string }>();
  const date = params.date ?? todayKey();
  const initialType: MealTypeKey = isMealTypeKey(params.type ?? '') ? (params.type as MealTypeKey) : 'breakfast';
  const initial = getDay(date).meals.find((m) => m.type === initialType)!;

  const [type, setType] = useState<MealTypeKey>(initialType);
  const [description, setDescription] = useState(initial.description);
  const [photos, setPhotos] = useState<ImageSourcePropType[]>(initial.photos);
  const [skipped, setSkipped] = useState(initial.status === 'skipped');
  const [reason, setReason] = useState(initial.skipReason);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);

  const close = () => router.back();
  const save = () => router.back();

  const addMockPhoto = () =>
    setPhotos((p) => (p.length >= MAX_PHOTOS ? p : [...p, MOCK_PICKS[p.length % MOCK_PICKS.length]]));

  const toggleSkip = (next: boolean) => {
    if (next && (description.trim() || photos.length)) {
      setConfirmSkip(true);
      return;
    }
    setSkipped(next);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="height">
      <ScreenHeader title="Meal Editor" leading="close" onLeadingPress={close} trailing={<PillButton label="Save" onPress={save} />} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.context}>
          {weekdayName(date)}, {formatDate(date)} · {mealType(type).time}
        </Text>

        <PhotoGrid photos={photos} onAdd={() => setPhotoSheet(true)} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} disabled={skipped} />

        <View style={styles.gap} />
        <TextField
          label="Description"
          placeholder="What did you eat?"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          showCounter
          disabled={skipped}
        />

        <View style={styles.skipRow}>
          <View style={styles.skipText}>
            <Text style={styles.skipLabel}>Skip this meal</Text>
            <Text style={styles.skipHint}>Counts as completed for the day</Text>
          </View>
          <Toggle label="Skip this meal" value={skipped} onChange={toggleSkip} />
        </View>
        {skipped && (
          <View style={styles.reason}>
            <TextField label="Reason (optional)" placeholder="e.g. Not hungry" value={reason} onChangeText={setReason} maxLength={80} />
          </View>
        )}

        <View style={styles.gap} />
        <Select label="Meal type" value={type} options={MEAL_OPTIONS} onChange={(v) => setType(v as MealTypeKey)} />
      </ScrollView>
      <BottomActions onCancel={close} onConfirm={save} bottomInset={insets.bottom} />

      <ActionSheet
        visible={photoSheet}
        title="Add photo"
        onClose={() => setPhotoSheet(false)}
        options={[
          { icon: 'camera', label: 'Take photo', onPress: addMockPhoto },
          { icon: 'image', label: 'Choose from gallery', onPress: addMockPhoto },
        ]}
      />
      <Dialog
        visible={confirmSkip}
        title="Skip this meal?"
        message="The description and photos will be removed."
        onClose={() => setConfirmSkip(false)}
        actions={[
          { label: 'Cancel' },
          {
            label: 'Skip meal',
            destructive: true,
            onPress: () => {
              setDescription('');
              setPhotos([]);
              setSkipped(true);
            },
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  context: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  gap: { height: 22 },
  skipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  skipText: { flex: 1 },
  skipLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.textPrimary },
  skipHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  reason: { marginTop: 16 },
});
