import type { PlannedReminder } from '@/lib/notifications/plan';

// In-memory stand-in for the native scheduler.
const mockScheduled = new Map<string, { identifier: string; content: { data: Record<string, unknown> } }>();
const mockSchedule = jest.fn(async (req: { identifier: string; content: { data: Record<string, unknown> } }) => {
  mockScheduled.set(req.identifier, { identifier: req.identifier, content: req.content });
  return req.identifier;
});
const mockCancel = jest.fn(async (id: string) => {
  mockScheduled.delete(id);
});

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(async () => null),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockScheduled.values()]),
  scheduleNotificationAsync: (req: never) => mockSchedule(req),
  cancelScheduledNotificationAsync: (id: string) => mockCancel(id),
}));

// eslint-disable-next-line import/first
import { applyReminderPlan } from '@/lib/notifications/apply';

const water = (hour: number): PlannedReminder => ({
  id: `water-${String(hour).padStart(2, '0')}00`,
  title: 'Time for some water',
  body: 'b',
  trigger: { kind: 'daily', hour, minute: 0 },
  url: '/day/today/water',
});
const eod = (body: string): PlannedReminder => ({ id: 'eod-2026-10-04', title: 't', body, trigger: { kind: 'date', at: 1 }, url: '/mealtimes' });

beforeEach(() => {
  mockScheduled.clear();
  jest.clearAllMocks();
});

describe('applyReminderPlan', () => {
  it('schedules a fresh plan', async () => {
    expect(await applyReminderPlan([water(8), water(10), eod('Lunch')])).toEqual({ scheduled: 3, cancelled: 0 });
    expect([...mockScheduled.keys()].sort()).toEqual(['eod-2026-10-04', 'water-0800', 'water-1000']);
  });

  it('leaves an unchanged plan alone', async () => {
    await applyReminderPlan([water(8), eod('Lunch')]);
    jest.clearAllMocks();
    expect(await applyReminderPlan([water(8), eod('Lunch')])).toEqual({ scheduled: 0, cancelled: 0 });
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('re-schedules only reminders whose content changed and cancels removed ones', async () => {
    await applyReminderPlan([water(8), water(10), eod('Lunch and Snacks')]);
    expect(await applyReminderPlan([water(8), eod('Snacks')])).toEqual({ scheduled: 1, cancelled: 2 });
    expect(mockCancel.mock.calls.map((c) => c[0]).sort()).toEqual(['eod-2026-10-04', 'water-1000']);
    expect(mockScheduled.get('eod-2026-10-04')?.content.data.url).toBe('/mealtimes');
  });

  it('does not touch notifications that are not reminders', async () => {
    mockScheduled.set('other', { identifier: 'other', content: { data: {} } });
    await applyReminderPlan([]);
    expect(mockScheduled.has('other')).toBe(true);
  });
});
