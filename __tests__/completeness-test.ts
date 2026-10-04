import { deriveMealStatus, isDayComplete, missingItems, summarizeDay } from '@/lib/completeness';
import { MEAL_TYPES } from '@/lib/meals';

const allMeals = (status: 'logged' | 'skipped') => MEAL_TYPES.map((m) => ({ type: m.key, status }));

describe('deriveMealStatus', () => {
  it('treats skipped as skipped regardless of content', () => {
    expect(deriveMealStatus({ skipped: true, description: 'Oats', photoCount: 2 })).toBe('skipped');
  });

  it('counts a description or a photo as logged', () => {
    expect(deriveMealStatus({ skipped: false, description: 'Oats', photoCount: 0 })).toBe('logged');
    expect(deriveMealStatus({ skipped: false, description: '', photoCount: 1 })).toBe('logged');
  });

  it('ignores whitespace-only descriptions', () => {
    expect(deriveMealStatus({ skipped: false, description: '  \n ', photoCount: 0 })).toBe('empty');
  });
});

describe('day completeness', () => {
  it('needs all 7 meals plus water and exercise', () => {
    const day = { meals: allMeals('logged'), water: '2 litres', exercise: '30 min walk' };
    expect(summarizeDay(day)).toEqual({ logged: 7, skipped: 0, missing: 0, done: 9, total: 9 });
    expect(isDayComplete(day)).toBe(true);
  });

  it('counts skipped meals as completed', () => {
    const day = { meals: allMeals('skipped'), water: 'x', exercise: 'y' };
    expect(isDayComplete(day)).toBe(true);
    expect(summarizeDay(day).skipped).toBe(7);
  });

  it('treats meal types without an entry as missing', () => {
    const day = { meals: [{ type: 'breakfast' as const, status: 'logged' as const }], water: '', exercise: '' };
    expect(summarizeDay(day)).toEqual({ logged: 1, skipped: 0, missing: 8, done: 1, total: 9 });
  });

  it('lists missing items in daily order with water and exercise last', () => {
    const day = {
      meals: allMeals('logged').map((m) => (m.type === 'lunch' || m.type === 'snacks' ? { ...m, status: 'empty' as const } : m)),
      water: ' ',
      exercise: '',
    };
    expect(missingItems(day)).toEqual(['Lunch', 'Snacks', 'Water intake', 'Exercise']);
  });

  it('reports nothing missing for a complete day', () => {
    expect(missingItems({ meals: allMeals('skipped'), water: '1 l', exercise: 'Rest day' })).toEqual([]);
  });
});
