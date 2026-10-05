import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInMinutes,
  differenceInMonths,
  format,
  parseISO,
} from 'date-fns';
import type { ISODate, ISODateTime } from './types';

/**
 * Date helpers. Calendar dates are stored as ISO dates (yyyy-MM-dd) and read
 * as local midnight, so day maths never drifts across DST or time zones.
 * PRD 9.15: "store dates, not counters".
 */

export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const parseDate = (iso: ISODate | ISODateTime): Date => parseISO(iso);

export const addDaysISO = (iso: ISODate, days: number): ISODate => toISODate(addDays(parseDate(iso), days));

/** Whole calendar days from a to b (b - a). */
export const calendarDaysBetween = (a: ISODate | Date, b: ISODate | Date): number =>
  differenceInCalendarDays(typeof b === 'string' ? parseDate(b) : b, typeof a === 'string' ? parseDate(a) : a);

// ---------- Formula tins (9.15) ----------

/** Discard date = opened date + use-within days; the opening day is day 0. */
export const formulaDiscardBy = (openedOn: ISODate, useWithinDays: number): ISODate =>
  addDaysISO(openedOn, useWithinDays);

/** Days left until the discard date. 0 on the discard date, negative after it. */
export const formulaDaysLeft = (discardBy: ISODate, now: Date): number => calendarDaysBetween(now, discardBy);

// ---------- Pregnancy and postpartum weeks ----------

export const PREGNANCY_DAYS = 280;

/**
 * Pregnancy week by the clinical convention: completed weeks.
 * 22 weeks and 3 days reads as "Week 22" (decision 2026-10-01).
 */
export function pregnancyWeek(dueDate: ISODate, now: Date): { week: number; day: number; gestationalDays: number } {
  const gestationalDays = PREGNANCY_DAYS - calendarDaysBetween(now, dueDate);
  return { week: Math.floor(gestationalDays / 7), day: ((gestationalDays % 7) + 7) % 7, gestationalDays };
}

/** Postpartum week: days 0 to 6 after birth are "Week 1" (decision 2026-10-01). */
export function postpartumWeek(birth: ISODateTime | ISODate, now: Date): number {
  return Math.floor(calendarDaysBetween(birth.slice(0, 10), now) / 7) + 1;
}

/** Child's age in years, months, days, as the Figma age pill shows it. */
export function childAge(dob: ISODate, now: Date): { years: number; months: number; days: number; totalMonths: number; totalDays: number } {
  const birth = parseDate(dob);
  const totalMonths = differenceInMonths(now, birth);
  const anchor = addMonths(birth, totalMonths); // clamps 31 Jan + 1 month to 28 Feb
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: calendarDaysBetween(anchor, now),
    totalMonths,
    totalDays: calendarDaysBetween(birth, now),
  };
}

export function formatChildAge(dob: ISODate, now: Date): string {
  const a = childAge(dob, now);
  const parts: string[] = [];
  if (a.years) parts.push(`${a.years}y`);
  if (a.months || a.years) parts.push(`${a.months}m`);
  parts.push(`${a.days}d`);
  return parts.join(' ');
}

// ---------- Display formats (section 14) ----------

/** "Thursday 27 August" */
export const formatLongDate = (d: Date | ISODate): string => format(typeof d === 'string' ? parseDate(d) : d, 'EEEE d MMMM');
/** "17 October" */
export const formatDayMonth = (d: Date | ISODate): string => format(typeof d === 'string' ? parseDate(d) : d, 'd MMMM');
/** "10:15 AM" (timeline) */
export const formatTime = (d: Date | ISODateTime): string => format(typeof d === 'string' ? parseDate(d) : d, 'h:mm a');
/** "10:45am" (medicine rows, sheets) */
export const formatTimeCompact = (d: Date | ISODateTime): string =>
  format(typeof d === 'string' ? parseDate(d) : d, 'h:mmaaa');

/** "1h 20m", "45m", "0m" */
export function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
}

/** "Feed, 2h ago" style time-since (5.2). */
export function formatTimeSince(from: Date | ISODateTime, now: Date): string {
  const mins = differenceInMinutes(now, typeof from === 'string' ? parseDate(from) : from);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const minutesSince = (from: Date | ISODateTime, now: Date): number =>
  differenceInMinutes(now, typeof from === 'string' ? parseDate(from) : from);

// ---------- Numbers in serif headlines (7.2) ----------

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Spell out a number for a headline: 7 -> "seven", 45 -> "forty-five". Numbers 100+ stay numerals. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

export const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
