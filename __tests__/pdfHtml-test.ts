import { buildArchiveHtml, escapeHtml, groupByIsoWeek } from '@/lib/backup/pdfHtml';
import type { DayRecord, MealRecord } from '@/lib/db/diaryRepo';
import { MEAL_TYPES, type MealTypeKey } from '@/lib/meals';

const day = (date: string, meals: Partial<Record<MealTypeKey, Partial<MealRecord>>> = {}, water = ''): DayRecord => ({
  date,
  water,
  exercise: '',
  meals: MEAL_TYPES.map((m) => ({ type: m.key, status: 'empty', description: '', skipReason: '', photos: [], updatedAt: null, ...meals[m.key] })),
});

const DAYS: DayRecord[] = [
  day('2026-09-26', { lunch: { status: 'logged', description: 'Dal <spicy> & rice', photos: [{ id: 'p', fileName: 'p.jpg', sortOrder: 0 }] } }),
  day('2026-09-27'),
  day('2026-09-28'), // week 40, nothing logged
  day('2026-10-05', { dinner: { status: 'skipped', skipReason: 'Late meeting' } }, '2 l'),
];

describe('groupByIsoWeek', () => {
  it('groups Monday–Sunday and drops empty weeks', () => {
    const weeks = groupByIsoWeek(DAYS, 'Anna');
    expect(weeks.map((w) => [w.start, w.end])).toEqual([
      ['2026-09-26', '2026-09-27'],
      ['2026-10-05', '2026-10-05'],
    ]);
  });
});

describe('buildArchiveHtml', () => {
  const html = buildArchiveHtml({
    name: 'Anna <A>',
    weeks: groupByIsoWeek(DAYS, 'Anna'),
    generatedAt: '04.10.2026',
    photoSrc: (f) => (f === 'p.jpg' ? 'data:image/jpeg;base64,AAAA' : null),
  });

  it('escapes user text', () => {
    expect(html).toContain('Dal &lt;spicy&gt; &amp; rice');
    expect(html).toContain('Anna &lt;A&gt;');
    expect(html).not.toContain('<spicy>');
  });

  it('includes weeks, days, skip reasons and photos', () => {
    expect(html).toContain('Week 39');
    expect(html).toContain('Week 41');
    expect(html).toContain('Skipped — Late meeting');
    expect(html).toContain('Nothing was logged for this day.');
    expect((html.match(/<img /g) ?? []).length).toBe(1);
    expect(html).toContain('2 weeks');
  });

  it('handles an empty diary', () => {
    expect(buildArchiveHtml({ name: '', weeks: [], generatedAt: 'x', photoSrc: () => null })).toContain('Nothing has been logged yet.');
  });

  it('escapes quotes for attributes', () => {
    expect(escapeHtml(`"a" 'b'`)).toBe('&quot;a&quot; &#39;b&#39;');
  });
});
