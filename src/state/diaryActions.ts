import { useMemo } from 'react';

import { saveDayText, saveMeal, type DayTextField, type SaveMealInput, type SaveMealResult } from '@/lib/db/diaryRepo';
import { useDb } from '@/lib/db/DbProvider';
import type { DateKey } from '@/lib/dates';
import { deletePhotoFiles } from '@/lib/photos';
import { notifyDiaryChanged } from '@/state/diaryEvents';

/** Diary writes that also clean up photo files and tell screens to reload. */
export function useDiaryActions() {
  const db = useDb();
  return useMemo(
    () => ({
      async saveMeal(date: DateKey, type: string, input: SaveMealInput, fromType?: string): Promise<SaveMealResult> {
        const result = await saveMeal(db, date, type, input, { fromType });
        deletePhotoFiles(result.removedFileNames);
        notifyDiaryChanged();
        return result;
      },
      async saveDayText(date: DateKey, field: DayTextField, text: string): Promise<void> {
        await saveDayText(db, date, field, text);
        notifyDiaryChanged();
      },
    }),
    [db],
  );
}
