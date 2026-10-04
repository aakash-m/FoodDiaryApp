import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';

import { strings } from '@/strings';

import type { ReportDay, ReportMeal, ReportModel } from './model';

// Builds the weekly .docx from the report model. No React Native imports, so it runs in unit tests.
// Always build a fresh Document per export: packing one instance twice corrupts it (Phase 0).

export type LoadedPhoto = { data: Uint8Array; width: number; height: number };
export type PhotoLoader = (fileName: string) => Promise<LoadedPhoto | null>;
export type BuildProgress = (done: number, total: number) => void;

const SAGE = '518059';
const SURFACE = 'D5E3CF';
const TEXT = '1C211B';
const MUTED = '6B7368';
const BORDER = 'B9C8B5';

/** A4 portrait with 2 cm margins → 9638 twips of usable width. */
const PAGE = { width: 11906, height: 16838, margin: 1134 };
const COLS = [2300, 3800, 3538];
/** Photos are fitted into this box so two always sit side by side in the photo column (~236 px). */
const PHOTO_BOX_PX = 100;

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

function cell(children: Paragraph[], width: number, opts: { header?: boolean } = {}): TableCell {
  return new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    verticalAlign: VerticalAlignTable.TOP,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: opts.header ? { type: ShadingType.CLEAR, color: 'auto', fill: SURFACE } : undefined,
  });
}

const text = (value: string, opts: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text: value, bold: opts.bold, italics: opts.italics, color: opts.color ?? TEXT, size: opts.size ?? 21 });

function headerRow(): TableRow {
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: ['Meal', 'What was eaten', 'Photos'].map((label, i) =>
      cell([new Paragraph({ children: [text(label, { bold: true })] })], COLS[i], { header: true }),
    ),
  });
}

async function mealRow(meal: ReportMeal, loadPhoto: PhotoLoader, tick: () => void): Promise<TableRow> {
  const muted = meal.status !== 'logged';
  const images: ImageRun[] = [];
  for (const fileName of meal.photos) {
    const photo = await loadPhoto(fileName);
    tick();
    if (!photo) continue;
    const scale = PHOTO_BOX_PX / Math.max(photo.width, photo.height, 1);
    const transformation = { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
    images.push(new ImageRun({ type: 'jpg', data: photo.data, transformation }));
  }
  // Two photos per line, separated by a small gap.
  const photoParagraphs: Paragraph[] = [];
  for (let i = 0; i < images.length; i += 2) {
    const pair = images.slice(i, i + 2);
    photoParagraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: pair.flatMap((img, j) => (j === 0 ? [img] : [new TextRun('  '), img])),
      }),
    );
  }
  return new TableRow({
    cantSplit: images.length <= 2,
    children: [
      cell([new Paragraph({ children: [text(meal.label, { bold: true })] }), new Paragraph({ children: [text(meal.time, { color: MUTED, size: 18 })] })], COLS[0]),
      cell([new Paragraph({ children: [text(meal.text, { italics: muted, color: muted ? MUTED : TEXT })] })], COLS[1]),
      cell(photoParagraphs.length ? photoParagraphs : [new Paragraph('')], COLS[2]),
    ],
  });
}

function dayTextRow(label: string, value: string, muted: boolean): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [
      cell([new Paragraph({ children: [text(label, { bold: true })] })], COLS[0]),
      new TableCell({
        children: [new Paragraph({ children: [text(value, { italics: muted, color: muted ? MUTED : TEXT })] })],
        columnSpan: 2,
        width: { size: COLS[1] + COLS[2], type: WidthType.DXA },
        borders: cellBorders,
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ],
  });
}

async function daySection(day: ReportDay, index: number, loadPhoto: PhotoLoader, tick: () => void): Promise<(Paragraph | Table)[]> {
  // Days with entries start on a new page; empty days are a single line and just follow on.
  const heading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: index > 0 && !day.empty,
    spacing: { before: day.empty && index > 0 ? 360 : 0, after: 120 },
    keepNext: true,
    children: [new TextRun({ text: day.heading, color: SAGE, bold: true, size: 30 })],
  });
  const progress = new Paragraph({
    spacing: { after: 160 },
    children: [text(`${day.summary.done} of ${day.summary.total} items completed`, { color: MUTED, size: 18 })],
  });
  if (day.empty) {
    return [heading, new Paragraph({ children: [text('Nothing was logged for this day.', { italics: true, color: MUTED })] })];
  }
  const rows: TableRow[] = [headerRow()];
  for (const meal of day.meals) rows.push(await mealRow(meal, loadPhoto, tick));
  rows.push(dayTextRow('Water intake', day.water, day.water === strings.notLogged));
  rows.push(dayTextRow('Exercise', day.exercise, day.exercise === strings.notLogged));
  return [
    heading,
    progress,
    new Table({
      rows,
      width: { size: COLS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths: COLS,
      layout: TableLayoutType.FIXED,
    }),
  ];
}

export async function buildReportDocument(model: ReportModel, loadPhoto: PhotoLoader, onProgress?: BuildProgress): Promise<Document> {
  const total = model.totals.photos;
  let done = 0;
  const tick = () => onProgress?.(++done, total);
  onProgress?.(0, total);

  const intro: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Food Diary', bold: true, color: SAGE, size: 48 })],
    }),
    ...(model.name ? [new Paragraph({ children: [text(model.name, { size: 26, bold: true })] })] : []),
    new Paragraph({ children: [text(`${model.rangeLabel} · ${model.weekLabel}`, { size: 22 })] }),
    new Paragraph({
      spacing: { before: 120, after: 360 },
      children: [
        text(
          `${model.totals.logged} meals logged · ${model.totals.skipped} skipped · ${model.totals.missing} items missing · ${model.totals.photos} photos`,
          { color: MUTED, size: 18 },
        ),
      ],
    }),
  ];

  const body: (Paragraph | Table)[] = [];
  for (const [i, day] of model.days.entries()) body.push(...(await daySection(day, i, loadPhoto, tick)));

  return new Document({
    creator: 'Food Diary',
    title: model.title,
    description: `Food diary ${model.rangeLabel}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 21, color: TEXT } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${model.title} · page `, color: MUTED, size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }),
                  new TextRun({ text: ' of ', color: MUTED, size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: [...intro, ...body],
      },
    ],
  });
}
