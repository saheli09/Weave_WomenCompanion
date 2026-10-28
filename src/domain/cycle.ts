import { addDaysISO, calendarDaysBetween, toISODate } from './dates';
import type { BleedingLevel, DomainState, ISODate } from './types';
import { addLog, TransitionError } from './transitions';

/**
 * Cycle tracking (B24, B25, 9.8). Period days are her explicit logs only;
 * bleeding logs never feed into this (6.3). No predictions until two complete
 * cycles exist, and then only as an estimate.
 */

export const MIN_COMPLETED_CYCLES = 2;

/** Log one period day (flow and symptoms). A day not touching an ongoing period starts a new one. */
export function logPeriodDay(state: DomainState, date: ISODate, flow: BleedingLevel, symptoms: string[], now: Date): DomainState {
  if (!state.her.cycle.active) throw new TransitionError('Cycle tracking is not on');
  if (date > toISODate(now)) throw new TransitionError('Cannot log a future day');
  const days = state.her.cycle.periodDays ?? [];
  const startsNew = !days.some((d) => d !== date && Math.abs(calendarDaysBetween(d, date)) <= 1);
  const at = date === toISODate(now) ? now : new Date(`${date}T09:00:00`);
  // Replace an earlier entry for the same day, so the calendar shows one flow per day.
  const logs = state.logs.filter((l) => !(l.type === 'period' && l.event !== 'end' && l.subject.kind === 'her' && toISODate(new Date(l.at)) === date));
  const withLog = addLog({ ...state, logs }, { kind: 'her' }, { type: 'period', flow, event: startsNew ? 'start' : 'day', symptoms: symptoms.length ? symptoms : undefined }, at, 'sheet').state;
  const periodDays = [...new Set([...days, date])].sort();
  const lastPeriodStart = periodStarts(periodDays).at(-1);
  return { ...withLog, her: { ...withLog.her, cycle: { ...withLog.her.cycle, periodDays, lastPeriodStart } } };
}

/** Remove a logged period day. */
export function removePeriodDay(state: DomainState, date: ISODate): DomainState {
  const periodDays = (state.her.cycle.periodDays ?? []).filter((d) => d !== date);
  const logs = state.logs.filter((l) => !(l.type === 'period' && l.subject.kind === 'her' && toISODate(new Date(l.at)) === date));
  return { ...state, logs, her: { ...state.her, cycle: { ...state.her.cycle, periodDays, lastPeriodStart: periodStarts(periodDays).at(-1) } } };
}

/** "End period": a quiet marker so Today stops counting days. */
export function endPeriod(state: DomainState, now: Date): DomainState {
  const r = addLog(state, { kind: 'her' }, { type: 'period', flow: 'spotting', event: 'end' }, now, 'sheet');
  return r.state;
}

/** Start dates of each run of consecutive period days. */
export function periodStarts(days: ISODate[]): ISODate[] {
  const sorted = [...new Set(days)].sort();
  return sorted.filter((d, i) => i === 0 || calendarDaysBetween(sorted[i - 1]!, d) > 1);
}

export interface PeriodRun {
  start: ISODate;
  end: ISODate;
  length: number;
}

export function periodRuns(days: ISODate[]): PeriodRun[] {
  const sorted = [...new Set(days)].sort();
  const runs: PeriodRun[] = [];
  for (const d of sorted) {
    const last = runs.at(-1);
    if (last && calendarDaysBetween(last.end, d) <= 1) {
      last.end = d;
      last.length = calendarDaysBetween(last.start, d) + 1;
    } else runs.push({ start: d, end: d, length: 1 });
  }
  return runs;
}

/** Cycle lengths between consecutive starts (each one a completed cycle). */
export function cycleLengths(days: ISODate[]): number[] {
  const starts = periodStarts(days);
  return starts.slice(1).map((s, i) => calendarDaysBetween(starts[i]!, s));
}

/** Next period estimate, only once two cycles are complete (9.8). */
export function nextPeriodEstimate(days: ISODate[]): ISODate | undefined {
  const lengths = cycleLengths(days);
  if (lengths.length < MIN_COMPLETED_CYCLES) return undefined;
  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  return addDaysISO(periodStarts(days).at(-1)!, avg);
}



/* ---------------------------------------------------------------------------
 * Estimates for the cycle calendar: past, current and upcoming cycles with an
 * estimated ovulation day and fertile window. Calendar arithmetic only, from her
 * own logged starts; never a method of contraception. Constants need clinical review.
 * ------------------------------------------------------------------------- */

/** Days from estimated ovulation to the next period (luteal phase). Needs clinical review. */
export const LUTEAL_DAYS = 14;
/** Fertile window: this many days before estimated ovulation, through ovulation day. Needs clinical review. */
export const FERTILE_DAYS_BEFORE = 5;
/** How far ahead the calendar shows predicted cycles. */
export const PREDICT_MONTHS = 3;

export interface CycleEstimate {
  kind: 'past' | 'current' | 'predicted';
  start: ISODate;
  /** Days to the next start: measured for past cycles, the average otherwise. */
  length: number;
  /** Logged period days for past and current cycles; the average length for predicted ones. */
  periodDays: ISODate[];
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
}

export interface CycleTimeline {
  cycles: CycleEstimate[];
  averageLength: number;
  averagePeriod: number;
  shortest: number;
  longest: number;
  nextStart: ISODate;
}

const span = (start: ISODate, n: number) => Array.from({ length: n }, (_, i) => addDaysISO(start, i));

function estimateFor(kind: CycleEstimate['kind'], start: ISODate, length: number, periodDays: ISODate[]): CycleEstimate {
  const ovulation = addDaysISO(start, length - LUTEAL_DAYS);
  return { kind, start, length, periodDays, ovulation, fertileStart: addDaysISO(ovulation, -FERTILE_DAYS_BEFORE), fertileEnd: ovulation };
}

/**
 * Every logged cycle plus predictions until the end of the month `PREDICT_MONTHS`
 * after `now`. Undefined until two cycles are complete (9.8), so the screen says
 * "Too early to estimate" instead.
 */
export function cycleTimeline(days: ISODate[], now: Date): CycleTimeline | undefined {
  const lengths = cycleLengths(days);
  if (lengths.length < MIN_COMPLETED_CYCLES) return undefined;
  const runs = periodRuns(days);
  const averageLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const averagePeriod = Math.round(runs.slice(0, -1).reduce((a, r) => a + r.length, 0) / (runs.length - 1));
  const cycles: CycleEstimate[] = runs.map((r, i) =>
    i < runs.length - 1 ? estimateFor('past', r.start, lengths[i]!, span(r.start, r.length)) : estimateFor('current', r.start, averageLength, span(r.start, r.length)),
  );
  const nextStart = addDaysISO(runs.at(-1)!.start, averageLength);
  const until = new Date(now.getFullYear(), now.getMonth() + PREDICT_MONTHS + 1, 0);
  for (let start = nextStart; new Date(`${start}T00:00:00`) <= until; start = addDaysISO(start, averageLength)) {
    cycles.push(estimateFor('predicted', start, averageLength, span(start, averagePeriod)));
  }
  return { cycles, averageLength, averagePeriod, shortest: Math.min(...lengths), longest: Math.max(...lengths), nextStart };
}

export interface CycleDay {
  period?: 'logged' | 'predicted';
  fertile: boolean;
  ovulation: boolean;
}

/** What the calendar shows on one day. Logged period days always win over estimates. */
export function cycleDay(timeline: CycleTimeline | undefined, days: ISODate[], iso: ISODate): CycleDay {
  const logged = days.includes(iso);
  if (!timeline) return { period: logged ? 'logged' : undefined, fertile: false, ovulation: false };
  const c = timeline.cycles.find((x) => iso >= x.fertileStart && iso <= x.fertileEnd);
  const predicted = !logged && timeline.cycles.some((x) => x.kind === 'predicted' && x.periodDays.includes(iso));
  return { period: logged ? 'logged' : predicted ? 'predicted' : undefined, fertile: Boolean(c) && !logged, ovulation: c?.ovulation === iso && !logged };
}

/** Day of the current cycle (1 = first period day), once tracking has a start. */
export function cycleDayNumber(days: ISODate[], now: Date): number | undefined {
  const start = periodStarts(days).at(-1);
  return start ? calendarDaysBetween(start, now) + 1 : undefined;
}

/* ---------------------------------------------------------------------------
 * Cycle phases (decision 2026-10-28): the cycle that holds today, split into
 * period, follicular, fertile window, ovulation and luteal, from the same
 * estimates as the calendar. Education, not a fertility score (PRD 2.2).
 * ------------------------------------------------------------------------- */

export type PhaseKey = 'period' | 'follicular' | 'fertile' | 'ovulation' | 'luteal';

export interface CyclePhase {
  key: PhaseKey;
  start: ISODate;
  end: ISODate;
  days: number;
}

export interface CyclePhases {
  start: ISODate;
  length: number;
  /** 1-based day of this cycle. */
  day: number;
  today: PhaseKey;
  phases: CyclePhase[];
}

export function cyclePhases(timeline: CycleTimeline | undefined, now: Date): CyclePhases | undefined {
  if (!timeline) return undefined;
  const today = toISODate(now);
  const c = timeline.cycles.find((x) => x.start <= today && today < addDaysISO(x.start, x.length));
  if (!c) return undefined;
  const last = addDaysISO(c.start, c.length - 1);
  // An ongoing period counts at least the usual length, so the follicular phase does not start early.
  const periodDays = Math.min(Math.max(c.periodDays.length, c.kind === 'current' ? timeline.averagePeriod : 0, 1), c.length);
  const periodEnd = addDaysISO(c.start, periodDays - 1);
  const raw: [PhaseKey, ISODate, ISODate][] = [
    ['period', c.start, periodEnd],
    ['follicular', addDaysISO(periodEnd, 1), addDaysISO(c.fertileStart, -1)],
    ['fertile', c.fertileStart > periodEnd ? c.fertileStart : addDaysISO(periodEnd, 1), addDaysISO(c.ovulation, -1)],
    ['ovulation', c.ovulation, c.ovulation],
    ['luteal', addDaysISO(c.ovulation, 1), last],
  ];
  const phases = raw
    .filter(([, s, e]) => s <= e && s <= last)
    .map(([key, s, e]) => ({ key, start: s, end: e > last ? last : e, days: calendarDaysBetween(s, e > last ? last : e) + 1 }));
  const now_ = phases.find((p) => p.start <= today && today <= p.end) ?? phases.at(-1)!;
  return { start: c.start, length: c.length, day: calendarDaysBetween(c.start, today) + 1, today: now_.key, phases };
}
