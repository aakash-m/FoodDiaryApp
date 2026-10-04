import { Packer } from 'docx';
import { strFromU8, unzipSync } from 'fflate';

import type { DayRecord, MealRecord } from '@/lib/db/diaryRepo';
import { MEAL_TYPES, type MealTypeKey } from '@/lib/meals';
import { buildReportDocument, type PhotoLoader } from '@/lib/report/docx';
import { buildReportModel, reportFileName } from '@/lib/report/model';

const meal = (type: MealTypeKey, patch: Partial<MealRecord> = {}): MealRecord => ({
  type,
  status: 'empty',
  description: '',
  skipReason: '',
  photos: [],
  updatedAt: null,
  ...patch,
});

function day(date: string, meals: Partial<Record<MealTypeKey, Partial<MealRecord>>> = {}, water = '', exercise = ''): DayRecord {
  return { date, water, exercise, meals: MEAL_TYPES.map((m) => meal(m.key, meals[m.key])) };
}

const photos = (...names: string[]) => names.map((fileName, sortOrder) => ({ id: fileName, fileName, sortOrder }));

const WEEK: DayRecord[] = [
  day(
    '2026-09-28',
    {
      breakfast: { status: 'logged', description: 'Oats with berries', photos: photos('a.jpg', 'b.jpg') },
      lunch: { status: 'skipped', skipReason: 'Not hungry' },
      snacks: { status: 'skipped' },
      dinner: { status: 'logged', photos: photos('c.jpg') },
    },
    '2 litres',
    '30 min walk',
  ),
  day('2026-09-29'),
  day('2026-09-30', { bed_time: { status: 'logged', description: 'Warm milk & honey <3' } }, '1.5 litres'),
];

describe('buildReportModel', () => {
  const model = buildReportModel('Anna Weber', WEEK);

  it('builds the header from name, range and ISO week', () => {
    expect(model.title).toBe('Food Diary — Anna Weber — 28.09.2026 to 30.09.2026 — Week 40');
    expect(model.fileName).toBe('FoodDiary_Anna-Weber_2026-09-28_2026-09-30.docx');
  });

  it('labels days and meal states', () => {
    const first = model.days[0];
    expect(first.heading).toBe('Monday, 28.09.2026');
    const byLabel = Object.fromEntries(first.meals.map((m) => [m.label, m.text]));
    expect(byLabel).toMatchObject({
      Breakfast: 'Oats with berries',
      Lunch: 'Skipped — Not hungry',
      Snacks: 'Skipped',
      Dinner: '(photo only)',
      'Early morning': 'Not logged',
    });
    expect(first.water).toBe('2 litres');
    expect(model.days[2].exercise).toBe('Not logged');
  });

  it('marks days with nothing logged and totals the week', () => {
    expect(model.days.map((d) => d.empty)).toEqual([false, true, false]);
    expect(model.totals).toEqual({ logged: 3, skipped: 2, missing: 27 - 3 - 2 - 2 - 1, photos: 3 });
  });

  it('spans two ISO weeks in the label', () => {
    expect(buildReportModel('A', [day('2026-10-04'), day('2026-10-05')]).weekLabel).toBe('Weeks 40–41');
  });

  it('rejects an empty range', () => {
    expect(() => buildReportModel('A', [])).toThrow();
  });
});

describe('reportFileName', () => {
  it('strips characters that are unsafe in file names', () => {
    expect(reportFileName(' Zoë / O’Brien ', '2026-10-01', '2026-10-07')).toBe('FoodDiary_Zoë-O-Brien_2026-10-01_2026-10-07.docx');
    expect(reportFileName('', '2026-10-01', '2026-10-07')).toBe('FoodDiary_Diary_2026-10-01_2026-10-07.docx');
  });
});

describe('buildReportDocument', () => {
  const fakeJpeg = (seed: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, seed, 0xff, 0xd9]);
  const loader: PhotoLoader = async (name) => (name === 'missing.jpg' ? null : { data: fakeJpeg(name.charCodeAt(0)), width: 800, height: 600 });

  async function packXml(days: DayRecord[], load = loader) {
    const doc = await buildReportDocument(buildReportModel('Anna Weber', days), load);
    const files = unzipSync(new Uint8Array(await Packer.toBuffer(doc)));
    return { files, xml: strFromU8(files['word/document.xml']) };
  }

  it('produces a valid package with every day, meal text and embedded photo', async () => {
    const { files, xml } = await packXml(WEEK);
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', 'word/document.xml', 'word/footer1.xml']));
    for (const s of ['Monday, 28.09.2026', 'Tuesday, 29.09.2026', 'Oats with berries', 'Skipped — Not hungry', 'Nothing was logged for this day.', '2 litres']) {
      expect(xml).toContain(s);
    }
    expect(xml).toContain('Warm milk &amp; honey &lt;3');
    expect(Object.keys(files).filter((f) => f.startsWith('word/media/') && !f.endsWith('/'))).toHaveLength(3);
    expect((xml.match(/<w:drawing>/g) ?? []).length).toBe(3);
  });

  it('starts each later day with entries on a new page; empty days follow on', async () => {
    // WEEK = logged day, empty day, logged day → only the third day breaks the page.
    const { xml } = await packXml(WEEK);
    expect((xml.match(/<w:pageBreakBefore\/>/g) ?? []).length).toBe(1);
  });

  it('fits photos into a 100 px box, keeping their aspect ratio', async () => {
    const tall: PhotoLoader = async () => ({ data: fakeJpeg(1), width: 600, height: 800 });
    const { xml } = await packXml([day('2026-10-01', { lunch: { status: 'logged', description: 'x', photos: photos('t.jpg') } })], tall);
    // 9525 EMU per px: 75 × 100 px
    expect(xml).toContain('cx="714375" cy="952500"');
  });

  it('skips photos whose file is missing instead of failing', async () => {
    const days = [day('2026-10-01', { lunch: { status: 'logged', description: 'x', photos: photos('missing.jpg', 'ok.jpg') } })];
    const { files } = await packXml(days);
    expect(Object.keys(files).filter((f) => f.startsWith('word/media/') && !f.endsWith('/'))).toHaveLength(1);
  });

  it('reports photo progress', async () => {
    const seen: [number, number][] = [];
    await buildReportDocument(buildReportModel('A', WEEK), loader, (done, total) => seen.push([done, total]));
    expect(seen).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('builds an independent document every time (a document must not be packed twice)', async () => {
    const model = buildReportModel('A', WEEK);
    const first = await buildReportDocument(model, loader);
    const second = await buildReportDocument(model, loader);
    expect(first).not.toBe(second);
    const rels = (d: Uint8Array) => (strFromU8(unzipSync(d)['word/_rels/document.xml.rels']).match(/<Relationship /g) ?? []).length;
    expect(rels(new Uint8Array(await Packer.toBuffer(first)))).toBe(rels(new Uint8Array(await Packer.toBuffer(second))));
  });
});
