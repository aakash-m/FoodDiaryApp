import type { ImageSourcePropType } from 'react-native';

import { addDays, diffDays, todayKey, type DateKey } from '@/lib/dates';
import { DAILY_ITEM_COUNT, MEAL_TYPES, type MealTypeKey } from '@/lib/meals';

// Deterministic placeholder diary used by the UI until the SQLite layer (Phase 1/3) exists.

export type MealStatus = 'empty' | 'logged' | 'skipped';

export type MockMeal = {
  type: MealTypeKey;
  status: MealStatus;
  description: string;
  skipReason: string;
  photos: ImageSourcePropType[];
};

export type MockDay = {
  date: DateKey;
  meals: MockMeal[];
  water: string;
  exercise: string;
};

const meal1 = require('@/assets/images/mock/meal-1.jpg');
const meal2 = require('@/assets/images/mock/meal-2.jpg');

const DESCRIPTIONS: Record<MealTypeKey, string[]> = {
  early_morning: ['Warm water with lemon', 'Green tea, 5 soaked almonds'],
  breakfast: ['Oats with berries and yoghurt', 'Two boiled eggs, wholegrain toast'],
  mid_morning: ['Apple and a handful of walnuts', 'Buttermilk'],
  lunch: ['Grilled chicken salad with quinoa', 'Dal, brown rice and mixed vegetables'],
  snacks: ['Roasted chickpeas, herbal tea', 'Fruit bowl'],
  dinner: ['Vegetable soup and grilled fish', 'Paneer stir-fry with salad'],
  bed_time: ['Warm turmeric milk', 'Chamomile tea'],
};

const HISTORY_DAYS = 45;

// Small seeded PRNG so the mock diary is the same on every launch.
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function buildDay(date: DateKey, daysAgo: number): MockDay {
  const isToday = daysAgo === 0;
  const meals = MEAL_TYPES.map((m, i): MockMeal => {
    const r = rand(daysAgo * 31 + i);
    // Today: the morning is logged, the rest of the day is still open.
    const status: MealStatus = isToday
      ? i < 4 ? 'logged' : i === 4 ? 'skipped' : 'empty'
      : r < 0.85 ? 'logged' : r < 0.97 ? 'skipped' : 'empty';
    const options = DESCRIPTIONS[m.key];
    return {
      type: m.key,
      status,
      description: status === 'logged' ? options[(daysAgo + i) % options.length] : '',
      skipReason: status === 'skipped' && r > 0.84 ? 'Not hungry' : '',
      photos: status === 'logged' && (daysAgo + i) % 3 !== 0 ? [i % 2 ? meal2 : meal1] : [],
    };
  });
  const r = rand(daysAgo * 17 + 99);
  return {
    date,
    meals,
    water: isToday ? '1.5 litres so far' : r < 0.95 ? `${2 + (daysAgo % 3) * 0.5} litres` : '',
    exercise: isToday ? '' : r < 0.8 ? ['30 min brisk walk', '45 min yoga', '20 min cycling'][daysAgo % 3] : '',
  };
}

const TODAY = todayKey();
const DAYS = new Map<DateKey, MockDay>(
  Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const date = addDays(TODAY, -i);
    return [date, buildDay(date, i)];
  }),
);

export const userName = 'Anna';

export function getDay(date: DateKey): MockDay {
  return DAYS.get(date) ?? emptyDay(date);
}

export function hasDay(date: DateKey): boolean {
  return DAYS.has(date);
}

function emptyDay(date: DateKey): MockDay {
  return {
    date,
    meals: MEAL_TYPES.map((m) => ({ type: m.key, status: 'empty', description: '', skipReason: '', photos: [] })),
    water: '',
    exercise: '',
  };
}

export type DaySummary = { logged: number; skipped: number; missing: number; done: number; total: number };

/** Completeness rules from PLAN.md: skipped counts as done; water/exercise need text. */
export function summarize(day: MockDay): DaySummary {
  const logged = day.meals.filter((m) => m.status === 'logged').length;
  const skipped = day.meals.filter((m) => m.status === 'skipped').length;
  const extras = (day.water.trim() ? 1 : 0) + (day.exercise.trim() ? 1 : 0);
  const done = logged + skipped + extras;
  return { logged, skipped, missing: DAILY_ITEM_COUNT - done, done, total: DAILY_ITEM_COUNT };
}

export function isFuture(date: DateKey): boolean {
  return diffDays(TODAY, date) > 0;
}

export type BackupInfo = { lastBackup: DateKey; folder: string; files: number; sizeMb: number };

export const backupInfo: BackupInfo = {
  lastBackup: addDays(TODAY, -5),
  folder: 'Downloads/FoodDiary',
  files: 6,
  sizeMb: 148,
};
