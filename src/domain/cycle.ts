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


