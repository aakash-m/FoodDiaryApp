import { DAILY_ITEM_COUNT, MEAL_TYPES, type MealTypeKey } from '@/lib/meals';
import { strings } from '@/strings';

// Completeness rules (PLAN.md §3): a meal is complete if skipped, or it has a non-blank description,
// or at least one photo. A day is complete when all 7 meals are complete and water + exercise are non-blank.

export type MealStatus = 'empty' | 'logged' | 'skipped';

export function deriveMealStatus(input: { skipped: boolean; description: string; photoCount: number }): MealStatus {
  if (input.skipped) return 'skipped';
  return input.description.trim() || input.photoCount > 0 ? 'logged' : 'empty';
}

export type DayCompletenessInput = {
  /** Meals that exist for the day; meal types without an entry count as empty. */
  meals: readonly { type: MealTypeKey; status: MealStatus }[];
  water: string;
  exercise: string;
};

export type DaySummary = { logged: number; skipped: number; missing: number; done: number; total: number };

function statusByType(day: DayCompletenessInput): Map<MealTypeKey, MealStatus> {
  return new Map(day.meals.map((m) => [m.type, m.status]));
}

export function summarizeDay(day: DayCompletenessInput): DaySummary {
  const statuses = statusByType(day);
  let logged = 0;
  let skipped = 0;
  for (const m of MEAL_TYPES) {
    const s = statuses.get(m.key);
    if (s === 'logged') logged++;
    else if (s === 'skipped') skipped++;
  }
  const extras = (day.water.trim() ? 1 : 0) + (day.exercise.trim() ? 1 : 0);
  const done = logged + skipped + extras;
  return { logged, skipped, missing: DAILY_ITEM_COUNT - done, done, total: DAILY_ITEM_COUNT };
}

export function isDayComplete(day: DayCompletenessInput): boolean {
  return summarizeDay(day).missing === 0;
}

/** Labels of everything still missing, in daily order: meals first, then water, then exercise. */
export function missingItems(day: DayCompletenessInput): string[] {
  const statuses = statusByType(day);
  const missing: string[] = MEAL_TYPES.filter((m) => (statuses.get(m.key) ?? 'empty') === 'empty').map((m) => m.label);
  if (!day.water.trim()) missing.push(strings.water);
  if (!day.exercise.trim()) missing.push(strings.exercise);
  return missing;
}
