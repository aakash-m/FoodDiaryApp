import {
  addDays,
  diffDays,
  formatDate,
  formatShortDate,
  isDateKey,
  isoWeek,
  relativeDay,
  monthGrid,
  startOfIsoWeek,
  weekdayName,
  weekLabel,
} from '@/lib/dates';

describe('formatting', () => {
  it('formats as dd.MM.yyyy and dd.MM', () => {
    expect(formatDate('2026-10-04')).toBe('04.10.2026');
    expect(formatShortDate('2026-01-09')).toBe('09.01');
  });

  it('names weekdays', () => {
    expect(weekdayName('2026-10-04')).toBe('Sunday');
    expect(weekdayName('2026-09-28')).toBe('Monday');
  });
});

describe('arithmetic', () => {
  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('runs in a DST timezone (guards the DST cases below)', () => {
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 30, 12).getTimezoneOffset()).toBe(-120);
  });

  it('counts whole days across DST changes', () => {
    // Europe switches to summer time on 29.03.2026 and back on 25.10.2026.
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});

describe('isDateKey', () => {
  it.each(['2026-10-04', '2028-02-29'])('accepts %s', (v) => expect(isDateKey(v)).toBe(true));
  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-5', '04.10.2026', '', '2026-10-04T00:00'])('rejects %s', (v) =>
    expect(isDateKey(v)).toBe(false),
  );
});

describe('ISO 8601 weeks', () => {
  it.each([
    ['2026-01-01', 1], // Thursday → week 1 of 2026
    ['2025-12-29', 1], // Monday belongs to 2026-W01
    ['2026-10-04', 40],
    ['2026-12-31', 53], // 2026 has 53 weeks
    ['2027-01-03', 53], // Sunday still in 2026-W53
    ['2027-01-04', 1],
    ['2021-01-03', 53], // belongs to 2020-W53
  ])('%s is week %i', (date, week) => expect(isoWeek(date)).toBe(week));

  it('labels single and spanning ranges', () => {
    expect(weekLabel('2026-09-28', '2026-10-04')).toBe('Week 40');
    expect(weekLabel('2026-09-30', '2026-10-06')).toBe('Weeks 40–41');
  });

  it('finds the Monday of the week', () => {
    expect(startOfIsoWeek('2026-10-04')).toBe('2026-09-28');
    expect(startOfIsoWeek('2026-09-28')).toBe('2026-09-28');
  });
});

describe('monthGrid', () => {
  it('pads October 2026 to whole Sunday-first weeks', () => {
    const cells = monthGrid(2026, 9);
    expect(cells.length % 7).toBe(0);
    expect(cells[0]).toEqual({ key: '2026-09-27', inMonth: false });
    expect(cells.find((c) => c.inMonth)?.key).toBe('2026-10-01');
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('handles February in a leap year', () => {
    expect(monthGrid(2028, 1).filter((c) => c.inMonth)).toHaveLength(29);
  });
});

describe('relativeDay', () => {
  it.each([
    ['2026-10-04', 'Today'],
    ['2026-10-03', 'Yesterday'],
    ['2026-09-30', '4 days ago'],
    ['2026-10-05', 'Today'],
  ])('%s → %s', (date, label) => expect(relativeDay(date, '2026-10-04')).toBe(label));
});
