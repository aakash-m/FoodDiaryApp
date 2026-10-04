import type { DayRecord } from '@/lib/db/diaryRepo';
import { isoWeek, startOfIsoWeek, type DateKey } from '@/lib/dates';
import { buildReportModel, type ReportModel } from '@/lib/report/model';
import { strings } from '@/strings';

// "Export all as PDF" (PLAN.md assumption 7): the whole diary grouped by ISO week, as print-ready HTML
// for expo-print. Pure, so it is unit-tested; the same ReportModel feeds the weekly .docx.

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Splits consecutive days into ISO weeks (Monday–Sunday), dropping weeks with nothing logged. */
export function groupByIsoWeek(days: DayRecord[], name: string): ReportModel[] {
  const weeks = new Map<DateKey, DayRecord[]>();
  for (const d of days) {
    const key = startOfIsoWeek(d.date);
    weeks.set(key, [...(weeks.get(key) ?? []), d]);
  }
  return [...weeks.values()].map((w) => buildReportModel(name, w)).filter((m) => m.days.some((d) => !d.empty));
}

const CSS = `
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { font-family: Roboto, Arial, sans-serif; color: #1C211B; font-size: 10.5pt; margin: 0; }
h1 { color: #518059; font-size: 24pt; margin: 0 0 4px; }
.cover { margin-bottom: 18px; }
.muted { color: #6B7368; }
.week { page-break-before: always; }
.week:first-of-type { page-break-before: auto; }
.week h2 { color: #518059; font-size: 15pt; margin: 0 0 8px; border-bottom: 2px solid #D5E3CF; padding-bottom: 4px; }
.day { margin: 12px 0 16px; page-break-inside: avoid; }
.day h3 { font-size: 12pt; margin: 0 0 6px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { background: #D5E3CF; text-align: left; font-weight: 600; }
th, td { border: 1px solid #B9C8B5; padding: 5px 7px; vertical-align: top; }
tr { page-break-inside: avoid; }
td.meal { width: 24%; } td.text { width: 40%; } td.photos { width: 36%; }
.time { color: #6B7368; font-size: 8.5pt; }
.skip, .none { color: #6B7368; font-style: italic; }
img { width: 72px; height: 72px; object-fit: cover; border-radius: 4px; margin: 0 4px 4px 0; }
.empty { color: #6B7368; font-style: italic; margin: 4px 0 10px; }
`;

function dayHtml(day: ReportModel['days'][number], photoSrc: (file: string) => string | null): string {
  if (day.empty) return `<div class="day"><h3>${escapeHtml(day.heading)}</h3><div class="empty">Nothing was logged for this day.</div></div>`;
  const rows = day.meals
    .map((m) => {
      const cls = m.status === 'skipped' ? 'skip' : m.status === 'empty' ? 'none' : '';
      const imgs = m.photos
        .map(photoSrc)
        .filter((src): src is string => !!src)
        .map((src) => `<img src="${src}" alt="">`)
        .join('');
      return `<tr><td class="meal"><b>${escapeHtml(m.label)}</b><br><span class="time">${escapeHtml(m.time)}</span></td><td class="text ${cls}">${escapeHtml(m.text)}</td><td class="photos">${imgs}</td></tr>`;
    })
    .join('');
  const extra = (label: string, value: string) =>
    `<tr><td class="meal"><b>${label}</b></td><td colspan="2" class="${value === strings.notLogged ? 'none' : ''}">${escapeHtml(value)}</td></tr>`;
  return `<div class="day"><h3>${escapeHtml(day.heading)} <span class="muted">· ${day.summary.done}/${day.summary.total}</span></h3>
<table><tr><th>Meal</th><th>What was eaten</th><th>Photos</th></tr>${rows}${extra('Water intake', day.water)}${extra('Exercise', day.exercise)}</table></div>`;
}

export function buildArchiveHtml(input: {
  name: string;
  weeks: ReportModel[];
  generatedAt: string;
  photoSrc: (fileName: string) => string | null;
}): string {
  const { name, weeks, generatedAt, photoSrc } = input;
  const span = weeks.length ? `${weeks[0].rangeLabel.split(' to ')[0]} to ${weeks[weeks.length - 1].rangeLabel.split(' to ')[1]}` : 'No entries yet';
  const cover = `<div class="cover"><h1>Food Diary</h1>${name ? `<div><b>${escapeHtml(name)}</b></div>` : ''}<div>${escapeHtml(span)}</div>
<div class="muted">${weeks.length} ${weeks.length === 1 ? 'week' : 'weeks'} · exported ${escapeHtml(generatedAt)}</div></div>`;
  const body = weeks
    .map((w) => `<section class="week"><h2>Week ${isoWeek(w.start)} · ${escapeHtml(w.rangeLabel)}</h2>${w.days.map((d) => dayHtml(d, photoSrc)).join('')}</section>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}${body || '<p class="empty">Nothing has been logged yet.</p>'}</body></html>`;
}
