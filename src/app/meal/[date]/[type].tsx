import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoGrid } from '@/components/PhotoGrid';
import { PillButton } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/ListRow';
import { BottomActions } from '@/components/ui/Misc';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Select } from '@/components/ui/Select';
import { ActionSheet, Dialog } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useDiaryQuery } from '@/hooks/useDiaryQuery';
import { getDay, MAX_DESCRIPTION_LENGTH, MAX_PHOTOS_PER_MEAL, MAX_SKIP_REASON_LENGTH, type DayRecord } from '@/lib/db/diaryRepo';
import { formatDate, isDateKey, todayKey, weekdayName } from '@/lib/dates';
import { MEAL_TYPES, isMealTypeKey, mealType, type MealTypeKey } from '@/lib/meals';
import { CameraPermissionError, pickFromGallery, takePhoto, type PickedImage } from '@/lib/photoPicker';
import { deletePhotoFiles, importPhoto, photoUri } from '@/lib/photos';
import { openAppSettings } from '@/lib/notifications/permissions';
import { useDiaryActions } from '@/state/diaryActions';
import { colors, fonts, spacing } from '@/theme/tokens';

// "Meal Editor – Part 1" mockup: photos, description, skip toggle, meal type.

const MEAL_OPTIONS = MEAL_TYPES.map((m) => ({ value: m.key, label: m.label, hint: m.time }));

type Draft = { type: MealTypeKey; description: string; skipped: boolean; skipReason: string; photos: string[] };

type Prompt =
  | { kind: 'discard' }
  | { kind: 'skip' }
  | { kind: 'replace'; label: string }
  | { kind: 'camera'; canAskAgain: boolean }
  | { kind: 'error'; message: string };

function draftFrom(day: DayRecord, type: MealTypeKey): Draft {
  const m = day.meals.find((x) => x.type === type)!;
  return {
    type,
    description: m.description,
    skipped: m.status === 'skipped',
    skipReason: m.skipReason,
    photos: m.photos.map((p) => p.fileName),
  };
}

const sameDraft = (a: Draft, b: Draft) =>
  a.type === b.type &&
  a.description.trim() === b.description.trim() &&
  a.skipped === b.skipped &&
  (a.skipped ? a.skipReason.trim() === b.skipReason.trim() : true) &&
  a.photos.join('|') === b.photos.join('|');

export default function MealEditorScreen() {
  const params = useLocalSearchParams<{ date: string; type: string }>();
  const date = params.date && isDateKey(params.date) ? params.date : todayKey();
  const initialType: MealTypeKey = isMealTypeKey(params.type ?? '') ? (params.type as MealTypeKey) : 'breakfast';
  const day = useDiaryQuery((db) => getDay(db, date), [date]);

  if (!day.data) {
    return (
      <View style={[styles.screen, styles.center]}>
        {day.error ? <Text style={styles.context}>{day.error.message}</Text> : <ActivityIndicator color={colors.sage} />}
      </View>
    );
  }
  return <Editor date={date} initialType={initialType} day={day.data} />;
}

function Editor({ date, initialType, day }: { date: string; initialType: MealTypeKey; day: DayRecord }) {
  const insets = useSafeAreaInsets();
  const actions = useDiaryActions();
  const [initial] = useState(() => draftFrom(day, initialType));
  const [draft, setDraft] = useState<Draft>(initial);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  // Photos imported in this session; deleted again if the user leaves without saving.
  const imported = useRef(new Set<string>());

  const dirty = !sameDraft(draft, initial);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const leave = () => {
    deletePhotoFiles(imported.current);
    imported.current.clear();
    router.back();
  };
  const requestClose = () => (dirty ? setPrompt({ kind: 'discard' }) : leave());

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  });

  const addPhotos = async (pick: () => Promise<PickedImage[]>) => {
    try {
      const picked = await pick();
      if (picked.length === 0) return;
      setImporting(true);
      const names: string[] = [];
      for (const image of picked) {
        const name = await importPhoto(image);
        imported.current.add(name);
        names.push(name);
      }
      setDraft((d) => ({ ...d, photos: [...d.photos, ...names].slice(0, MAX_PHOTOS_PER_MEAL) }));
    } catch (e) {
      if (e instanceof CameraPermissionError) setPrompt({ kind: 'camera', canAskAgain: e.canAskAgain });
      else setPrompt({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setImporting(false);
    }
  };

  const removePhoto = (index: number) => {
    const name = draft.photos[index];
    set({ photos: draft.photos.filter((_, i) => i !== index) });
    // Never-saved photos can go straight away; saved ones are deleted after a successful save.
    if (imported.current.has(name)) {
      deletePhotoFiles([name]);
      imported.current.delete(name);
    }
  };

  const toggleSkip = (next: boolean) => {
    if (next && (draft.description.trim() || draft.photos.length)) setPrompt({ kind: 'skip' });
    else set({ skipped: next });
  };

  const save = async (confirmedReplace = false) => {
    if (saving || importing) return;
    const target = day.meals.find((m) => m.type === draft.type)!;
    if (!confirmedReplace && draft.type !== initialType && target.status !== 'empty') {
      setPrompt({ kind: 'replace', label: mealType(draft.type).label });
      return;
    }
    setSaving(true);
    try {
      await actions.saveMeal(
        date,
        draft.type,
        { description: draft.description, skipped: draft.skipped, skipReason: draft.skipReason, photoFileNames: draft.photos },
        initialType,
      );
      // Imported photos that were removed again before saving are not in the database.
      deletePhotoFiles([...imported.current].filter((n) => !draft.photos.includes(n)));
      imported.current.clear();
      router.back();
    } catch (e) {
      setPrompt({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const remaining = MAX_PHOTOS_PER_MEAL - draft.photos.length;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="height">
      <ScreenHeader
        title="Meal Editor"
        leading="close"
        onLeadingPress={requestClose}
        trailing={<PillButton label="Save" onPress={() => save()} disabled={saving || importing} />}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.context}>
          {weekdayName(date)}, {formatDate(date)} · {mealType(draft.type).time}
        </Text>

        <PhotoGrid
          photos={draft.photos.map(photoUri)}
          onAdd={() => setPhotoSheet(true)}
          onRemove={removePhoto}
          disabled={draft.skipped}
          busy={importing}
        />

        <View style={styles.gap} />
        <TextField
          label="Description"
          placeholder="What did you eat?"
          value={draft.description}
          onChangeText={(description) => set({ description })}
          multiline
          maxLength={MAX_DESCRIPTION_LENGTH}
          showCounter
          disabled={draft.skipped}
        />

        <View style={styles.skipRow}>
          <View style={styles.skipText}>
            <Text style={styles.skipLabel}>Skip this meal</Text>
            <Text style={styles.skipHint}>Counts as completed for the day</Text>
          </View>
          <Toggle label="Skip this meal" value={draft.skipped} onChange={toggleSkip} />
        </View>
        {draft.skipped && (
          <View style={styles.reason}>
            <TextField
              label="Reason (optional)"
              placeholder="e.g. Not hungry"
              value={draft.skipReason}
              onChangeText={(skipReason) => set({ skipReason })}
              maxLength={MAX_SKIP_REASON_LENGTH}
            />
          </View>
        )}

        <View style={styles.gap} />
        <Select label="Meal type" value={draft.type} options={MEAL_OPTIONS} onChange={(v) => set({ type: v as MealTypeKey })} />
      </ScrollView>
      <BottomActions onCancel={requestClose} onConfirm={() => save()} confirmLabel={saving ? 'Saving…' : 'Save'} bottomInset={insets.bottom} />

      <ActionSheet
        visible={photoSheet}
        title={`Add photo · ${remaining} of ${MAX_PHOTOS_PER_MEAL} left`}
        onClose={() => setPhotoSheet(false)}
        options={[
          { icon: 'camera', label: 'Take photo', onPress: () => addPhotos(takePhoto) },
          { icon: 'image', label: 'Choose from gallery', onPress: () => addPhotos(() => pickFromGallery(remaining)) },
        ]}
      />
      <PromptDialog
        prompt={prompt}
        onClose={() => setPrompt(null)}
        onDiscard={leave}
        onSkip={() => {
          // Unsaved photos go now; saved ones are only deleted once the skip is saved.
          deletePhotoFiles(imported.current);
          imported.current.clear();
          set({ skipped: true, description: '', photos: [] });
        }}
        onReplace={() => save(true)}
      />
    </KeyboardAvoidingView>
  );
}

function PromptDialog({
  prompt,
  onClose,
  onDiscard,
  onSkip,
  onReplace,
}: {
  prompt: Prompt | null;
  onClose: () => void;
  onDiscard: () => void;
  onSkip: () => void;
  onReplace: () => void;
}) {
  const content = (() => {
    switch (prompt?.kind) {
      case 'discard':
        return { title: 'Discard changes?', message: 'Your changes to this meal will be lost.', actions: [{ label: 'Keep editing' }, { label: 'Discard', destructive: true, onPress: onDiscard }] };
      case 'skip':
        return { title: 'Skip this meal?', message: 'The description and photos will be removed.', actions: [{ label: 'Cancel' }, { label: 'Skip meal', destructive: true, onPress: onSkip }] };
      case 'replace':
        return {
          title: `Replace ${prompt.label}?`,
          message: `${prompt.label} already has an entry for this day. Saving moves this meal there and replaces it.`,
          actions: [{ label: 'Cancel' }, { label: 'Replace', destructive: true, onPress: onReplace }],
        };
      case 'camera':
        return {
          title: 'Camera access needed',
          message: prompt.canAskAgain ? 'Allow camera access to take meal photos.' : 'Camera access is turned off for Food Diary. You can allow it in your phone settings.',
          actions: prompt.canAskAgain ? [{ label: 'OK', primary: true }] : [{ label: 'Cancel' }, { label: 'Open settings', primary: true, onPress: () => void openAppSettings() }],
        };
      case 'error':
        return { title: 'Something went wrong', message: prompt.message, actions: [{ label: 'OK', primary: true }] };
      default:
        return { title: '', message: '', actions: [] };
    }
  })();
  return <Dialog visible={!!prompt} title={content.title} message={content.message} actions={content.actions} onClose={onClose} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.screen },
  content: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  context: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  gap: { height: 22 },
  skipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  skipText: { flex: 1 },
  skipLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.textPrimary },
  skipHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  reason: { marginTop: 16 },
});
