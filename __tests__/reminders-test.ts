import type { DayCompletenessInput } from '@/lib/completeness';
import { MEAL_TYPES } from '@/lib/meals';
import { joinList, parseTime, planReminders, reminderSignature, waterTimes, type ReminderSettings } from '@/lib/notifications/plan';

const SETTINGS: ReminderSettings = {
  waterReminder: true,
  waterStart: '08:00',
  waterEnd: '22:00',
  endOfDayReminder: true,
  endOfDayTime: '22:30',
};

const TODAY = '2026-10-04';
const at = (h: number, m = 0, date = TODAY) => {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m);
};

const emptyDay: DayCompletenessInput = { meals: [], water: '', exercise: '' };
const completeDay: DayCompletenessInput = { meals: MEAL_TYPES.map((m) => ({ type: m.key, status: 'logged' })), water: '2 l', exercise: 'walk' };

describe('time helpers', () => {
  it('parses HH:mm and rejects garbage', () => {
    expect(parseTime('08:30')).toEqual({ hour: 8, minute: 30 });
    expect(() => parseTime('24:00')).toThrow();
    expect(() => parseTime('8.30')).toThrow();
  });

  it('spaces water reminders every 2 hours within the window', () => {
    expect(waterTimes('08:00', '22:00').map((t) => t.hour)).toEqual([8, 10, 12, 14, 16, 18, 20, 22]);
    expect(waterTimes('07:00', '20:00').map((t) => t.hour)).toEqual([7, 9, 11, 13, 15, 17, 19]);
  });

  it('joins lists naturally', () => {
    expect(joinList(['Lunch'])).toBe('Lunch');
    expect(joinList(['Lunch', 'Exercise'])).toBe('Lunch and Exercise');
    expect(joinList(['Lunch', 'Snacks', 'Exercise'])).toBe('Lunch, Snacks and Exercise');
  });
});

describe('planReminders', () => {
  it('plans daily water reminders and 8 end-of-day checks in the morning', () => {
    const plan = planReminders({ settings: SETTINGS, now: at(9), today: TODAY, todayDay: emptyDay });
    expect(plan.filter((r) => r.id.startsWith('water-')).map((r) => r.id)).toEqual([
      'water-0800', 'water-1000', 'water-1200', 'water-1400', 'water-1600', 'water-1800', 'water-2000', 'water-2200',
    ]);
    const eod = plan.filter((r) => r.id.startsWith('eod-'));
    expect(eod.map((r) => r.id)).toEqual([
      'eod-2026-10-04', 'eod-2026-10-05', 'eod-2026-10-06', 'eod-2026-10-07',
      'eod-2026-10-08', 'eod-2026-10-09', 'eod-2026-10-10', 'eod-2026-10-11',
    ]);
    expect(eod[0].trigger).toEqual({ kind: 'date', at: at(22, 30).getTime() });
  });

  it('lists exactly what is missing today', () => {
    const day: DayCompletenessInput = {
      meals: completeDay.meals.map((m) => (m.type === 'lunch' || m.type === 'snacks' ? { ...m, status: 'empty' as const } : m)),
      water: '2 l',
      exercise: '',
    };
    const [today] = planReminders({ settings: SETTINGS, now: at(12), today: TODAY, todayDay: day }).filter((r) => r.id.startsWith('eod-'));
    expect(today.body).toBe('Still missing today: Lunch, Snacks and Exercise.');
    expect(today.url).toBe('/mealtimes');
  });

  it('skips today when the day is complete, keeping future days', () => {
    const eod = planReminders({ settings: SETTINGS, now: at(12), today: TODAY, todayDay: completeDay }).filter((r) => r.id.startsWith('eod-'));
    expect(eod[0].id).toBe('eod-2026-10-05');
    expect(eod).toHaveLength(7);
  });

  it('skips today once the check time has passed', () => {
    const eod = planReminders({ settings: SETTINGS, now: at(22, 31), today: TODAY, todayDay: emptyDay }).filter((r) => r.id.startsWith('eod-'));
    expect(eod[0].id).toBe('eod-2026-10-05');
  });

  it('counts skipped meals as done', () => {
    const skipped: DayCompletenessInput = { meals: MEAL_TYPES.map((m) => ({ type: m.key, status: 'skipped' })), water: 'x', exercise: 'y' };
    const eod = planReminders({ settings: SETTINGS, now: at(12), today: TODAY, todayDay: skipped }).filter((r) => r.id.startsWith('eod-'));
    expect(eod.some((r) => r.id === `eod-${TODAY}`)).toBe(false);
  });

  it('plans nothing when both reminders are off', () => {
    expect(planReminders({ settings: { ...SETTINGS, waterReminder: false, endOfDayReminder: false }, now: at(9), today: TODAY, todayDay: emptyDay })).toEqual([]);
  });

  it('keeps local wall-clock times across the DST switch (25.10.2026)', () => {
    const plan = planReminders({ settings: SETTINGS, now: at(9, 0, '2026-10-24'), today: '2026-10-24', todayDay: emptyDay });
    const trigger = plan.find((r) => r.id === 'eod-2026-10-26')!.trigger;
    if (trigger.kind !== 'date') throw new Error('expected a date trigger');
    const fires = new Date(trigger.at);
    expect([fires.getDate(), fires.getHours(), fires.getMinutes()]).toEqual([26, 22, 30]);
  });

  it('gives changed content a different signature', () => {
    const a = planReminders({ settings: SETTINGS, now: at(9), today: TODAY, todayDay: emptyDay })[8];
    const b = planReminders({ settings: SETTINGS, now: at(9), today: TODAY, todayDay: completeDay })[8];
    expect(a.id).toBe(`eod-${TODAY}`);
    expect(b.id).not.toBe(a.id);
    expect(reminderSignature(a)).toBe(reminderSignature({ ...a }));
    expect(reminderSignature(a)).not.toBe(reminderSignature({ ...a, body: 'x' }));
  });
});
