export const MEAL_TYPES = [
  { key: 'early_morning', label: 'Early morning', time: '07:00 – 07:30' },
  { key: 'breakfast', label: 'Breakfast', time: '08:30 – 09:00' },
  { key: 'mid_morning', label: 'Mid morning', time: '11:00 – 11:30' },
  { key: 'lunch', label: 'Lunch', time: '13:00 – 14:00' },
  { key: 'snacks', label: 'Snacks', time: '16:00 – 17:00' },
  { key: 'dinner', label: 'Dinner', time: '19:30 – 20:00' },
  { key: 'bed_time', label: 'Bed time', time: '22:00' },
] as const;

export type MealTypeKey = (typeof MEAL_TYPES)[number]['key'];

export function mealType(key: string) {
  return MEAL_TYPES.find((m) => m.key === key) ?? MEAL_TYPES[0];
}

export function isMealTypeKey(key: string): key is MealTypeKey {
  return MEAL_TYPES.some((m) => m.key === key);
}

/** 7 meals + water + exercise. */
export const DAILY_ITEM_COUNT = MEAL_TYPES.length + 2;
