import { summarizeDay, type DaySummary } from '@/lib/completeness';
import type { DayRecord } from '@/lib/db/diaryRepo';
import { formatDate, weekdayName, weekLabel, type DateKey } from '@/lib/dates';
import { mealType } from '@/lib/meals';
import { strings } from '@/strings';

// One model feeds both the in-app preview and the .docx, so they always agree (PLAN.md §4).

export type ReportMeal = {
  label: string;
  time: string;
  status: 'logged' | 'skipped' | 'empty';
  /** Description, "Skipped — reason", or "Not logged". */
  text: string;
  /** Photo file names in display order (empty unless logged). */
  photos: string[];
};

export type ReportDay = {
  date: DateKey;
  /** "Monday, 28.09.2026" */
  heading: string;
  meals: ReportMeal[];
  water: string;
  exercise: string;
  summary: DaySummary;
  /** Nothing at all was entered for this day. */
  empty: boolean;
};

export type ReportModel = {
  /** "Food Diary — Anna — 28.09.2026 to 04.10.2026 — Week 40" */
  title: string;
  name: string;
  start: DateKey;
  end: DateKey;
  rangeLabel: string;
  weekLabel: string;
  days: ReportDay[];
  totals: { logged: number; skipped: number; missing: number; photos: number };
  fileName: string;
};

export function mealText(m: Pick<ReportMeal, 'status'> & { description: string; skipReason: string }): string {
  if (m.status === 'skipped') return m.skipReason ? `${strings.skipped} — ${m.skipReason}` : strings.skipped;
  if (m.status === 'logged') return m.description || '(photo only)';
  return strings.notLogged;
}

/** File-system-safe report name, e.g. FoodDiary_Anna_2026-09-28_2026-10-04.docx */
export function reportFileName(name: string, start: DateKey, end: DateKey): string {
  const safe = name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return `FoodDiary_${safe || 'Diary'}_${start}_${end}.docx`;
}

export function buildReportModel(name: string, days: DayRecord[]): ReportModel {
  if (days.length === 0) throw new Error('A report needs at least one day');
  const start = days[0].date;
  const end = days[days.length - 1].date;
  const reportDays: ReportDay[] = days.map((d) => {
    const meals: ReportMeal[] = d.meals.map((m) => {
      const t = mealType(m.type);
      return {
        label: t.label,
        time: t.time,
        status: m.status,
        text: mealText(m),
        photos: m.status === 'logged' ? m.photos.map((p) => p.fileName) : [],
      };
    });
    const summary = summarizeDay(d);
    return {
      date: d.date,
      heading: `${weekdayName(d.date)}, ${formatDate(d.date)}`,
      meals,
      water: d.water.trim() || strings.notLogged,
      exercise: d.exercise.trim() || strings.notLogged,
      summary,
      empty: summary.done === 0,
    };
  });
  const rangeLabel = `${formatDate(start)} to ${formatDate(end)}`;
  const week = weekLabel(start, end);
  const trimmed = name.trim();
  return {
    title: ['Food Diary', trimmed, rangeLabel, week].filter(Boolean).join(' — '),
    name: trimmed,
    start,
    end,
    rangeLabel,
    weekLabel: week,
    days: reportDays,
    totals: {
      logged: reportDays.reduce((n, d) => n + d.summary.logged, 0),
      skipped: reportDays.reduce((n, d) => n + d.summary.skipped, 0),
      missing: reportDays.reduce((n, d) => n + d.summary.missing, 0),
      photos: reportDays.reduce((n, d) => n + d.meals.reduce((k, m) => k + m.photos.length, 0), 0),
    },
    fileName: reportFileName(trimmed, start, end),
  };
}
