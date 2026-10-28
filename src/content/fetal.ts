import { copy, type CopyEntry, type Review } from './copy';

/**
 * "Your baby this week" on the Pregnancy tab (decision 2026-10-28). Typical
 * length and weight by week, with one development line. Length is crown to
 * rump until week 20, then head to heel, as most published charts measure it.
 * Figures are rounded averages, shown as "about", never as a target.
 * All of it NEEDS CLINICAL REVIEW before it ships.
 */
export interface FetalWeek {
  week: number;
  /** Typical length in millimetres. */
  lengthMm: number;
  /** Typical weight in grams; absent while too small to weigh meaningfully. */
  weightG?: number;
  line: CopyEntry;
}

export const FETAL_REVIEW: Review = { kind: 'clinical', ref: '9.5', note: 'Fetal development by week: sizes and development lines' };

export const FETAL_WEEKS: FetalWeek[] = [
  { week: 4, lengthMm: 2, line: copy('The pregnancy is settling in, and the neural tube is starting to form.', 'body') },
  { week: 6, lengthMm: 6, line: copy('A tiny heartbeat can sometimes be seen on a scan around now.', 'body') },
  { week: 8, lengthMm: 16, weightG: 1, line: copy('Fingers and toes are starting to form.', 'body') },
  { week: 10, lengthMm: 31, weightG: 4, line: copy('The main organs have all begun to form.', 'body') },
  { week: 12, lengthMm: 54, weightG: 14, line: copy('Reflexes are starting: the hands can open and close.', 'body') },
  { week: 14, lengthMm: 87, weightG: 43, line: copy('The face is moving now, with small squints and frowns.', 'body') },
  { week: 16, lengthMm: 116, weightG: 100, line: copy('The eyes can make small movements behind closed lids.', 'body') },
  { week: 18, lengthMm: 142, weightG: 190, line: copy('The ears are in place, and sounds are starting to reach them.', 'body') },
  { week: 20, lengthMm: 256, weightG: 300, line: copy('Swallowing practice has begun. You may feel the first movements.', 'body') },
  { week: 22, lengthMm: 278, weightG: 430, line: copy('Eyebrows and eyelids are in place.', 'body') },
  { week: 24, lengthMm: 300, weightG: 600, line: copy('The lungs are growing their branches.', 'body') },
  { week: 26, lengthMm: 356, weightG: 760, line: copy('The eyes are beginning to open.', 'body') },
  { week: 28, lengthMm: 376, weightG: 1000, line: copy('Blinking has started, and so have sleep and wake cycles.', 'body') },
  { week: 30, lengthMm: 399, weightG: 1300, line: copy('Weight is building steadily from here.', 'body') },
  { week: 32, lengthMm: 424, weightG: 1700, line: copy('Breathing movements are being practised.', 'body') },
  { week: 34, lengthMm: 450, weightG: 2100, line: copy('The nervous system is maturing quickly.', 'body') },
  { week: 36, lengthMm: 474, weightG: 2600, line: copy('Your baby may settle head down around now.', 'body') },
  { week: 38, lengthMm: 498, weightG: 3100, line: copy('Fat stores keep building for life outside.', 'body') },
  { week: 40, lengthMm: 512, weightG: 3500, line: copy('Ready to meet you, any day now.', 'body') },
];

/** The entry for this week: the latest one at or before it. Undefined before week 4. */
export function fetalForWeek(week: number): FetalWeek | undefined {
  return [...FETAL_WEEKS].reverse().find((f) => f.week <= week);
}
