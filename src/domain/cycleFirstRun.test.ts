import { buildPersona, ANCHOR } from '../state/personas';
import { cycleDayNumber, cycleStartUnknown, nextPeriod, roughNextPeriod, setDaySymptoms, setUsualCycleLength, startCycleFrom, TYPICAL_CYCLE_DAYS } from './cycle';
import { currentPeriodDay } from './stage';
import { addDaysISO, toISODate } from './dates';
import { checkInvariants } from './transitions';
import type { DomainState } from './types';

/** A cycle tracker on her first day: nothing logged, no period days. */
function blank(): DomainState {
  const s = buildPersona('D7');
  return { ...s, logs: [], vitals: undefined, devices: undefined, her: { ...s.her, cycle: { active: true } } };
}
const today = toISODate(ANCHOR);

describe('first-run cycle (decision 2026-10-31)', () => {
  it('no cycle numbers until a start is saved', () => {
    const s = blank();
    expect(cycleDayNumber(s.her.cycle.periodDays ?? [], ANCHOR)).toBeUndefined();
    expect(roughNextPeriod(s.her.cycle.periodDays ?? [], ANCHOR)).toBeUndefined();
  });

  it('Today starts a period: day 1, and a rough estimate a typical cycle on', () => {
    const s = startCycleFrom(blank(), today, ANCHOR);
    expect(s.her.cycle.periodDays).toEqual([today]);
    expect(currentPeriodDay(s, ANCHOR)).toBe(1);
    expect(roughNextPeriod(s.her.cycle.periodDays!, ANCHOR)).toBe(addDaysISO(today, TYPICAL_CYCLE_DAYS));
    expect(s.logs.filter((l) => l.type === 'period')).toHaveLength(1);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('a start twelve days ago is cycle day 12, with the rough next period still ahead', () => {
    const start = addDaysISO(today, -11);
    const s = startCycleFrom(blank(), start, ANCHOR);
    expect(cycleDayNumber(s.her.cycle.periodDays!, ANCHOR)).toBe(12);
    expect(currentPeriodDay(s, ANCHOR)).toBeUndefined(); // over a week ago: finished, not "Period, day 12"
    expect(currentPeriodDay(startCycleFrom(blank(), addDaysISO(today, -6), ANCHOR), ANCHOR)).toBe(7);
    expect(roughNextPeriod(s.her.cycle.periodDays!, ANCHOR)).toBe(addDaysISO(start, 28));
  });

  it('no rough estimate once it has passed, or once a real estimate exists', () => {
    expect(roughNextPeriod([addDaysISO(today, -40)], ANCHOR)).toBeUndefined();
    const d7 = buildPersona('D7');
    expect(roughNextPeriod(d7.her.cycle.periodDays!, ANCHOR)).toBeUndefined();
  });

  it('I don’t remember turns tracking on with no start; saving a date later clears it', () => {
    let s = cycleStartUnknown({ ...blank(), her: { ...blank().her, cycle: { active: false } } });
    expect(s.her.cycle).toEqual({ active: true, startUnknown: true });
    s = startCycleFrom(s, today, ANCHOR);
    expect(s.her.cycle.startUnknown).toBeUndefined();
  });

  it('symptoms on a non-period day are their own logs; cleared chips go, other symptoms stay', () => {
    const offered = ['Cramps', 'Headache', 'Other'];
    let s = blank();
    s = { ...s, logs: [{ id: 'x', subject: { kind: 'her' }, at: ANCHOR.toISOString(), source: 'sheet', type: 'symptom', name: 'Nausea' } as DomainState['logs'][number]] };
    s = setDaySymptoms(s, today, ['Cramps', 'Headache'], offered, ANCHOR);
    const names = () => s.logs.flatMap((l) => (l.type === 'symptom' ? [l.name] : [])).sort();
    expect(names()).toEqual(['Cramps', 'Headache', 'Nausea']);
    s = setDaySymptoms(s, today, ['Cramps'], offered, ANCHOR);
    expect(names()).toEqual(['Cramps', 'Nausea']);
    expect(s.her.cycle.periodDays ?? []).toEqual([]);
  });

  it('symptoms on a period day sit on that day’s period log', () => {
    let s = startCycleFrom(blank(), today, ANCHOR);
    s = setDaySymptoms(s, today, ['Cramps'], ['Cramps'], ANCHOR);
    const period = s.logs.filter((l) => l.type === 'period');
    expect(period).toHaveLength(1);
    expect(period[0]!.type === 'period' && period[0]!.symptoms).toEqual(['Cramps']);
    expect(s.logs.some((l) => l.type === 'symptom')).toBe(false);
  });

  it('days until the next period: counted from today, rough from a 28-day cycle', () => {
    const start = addDaysISO(today, -11); // cycle day 12
    const s = startCycleFrom(blank(), start, ANCHOR);
    expect(nextPeriod(s, ANCHOR)).toEqual({ date: addDaysISO(start, 28), days: 17, basis: 'usual', cycles: 0, length: 28 });
    expect(nextPeriod(s, new Date(`${addDaysISO(start, 27)}T08:00:00`))?.days).toBe(1);
    expect(nextPeriod(s, new Date(`${addDaysISO(start, 28)}T08:00:00`))?.days).toBe(0);
    expect(nextPeriod(s, new Date(`${addDaysISO(start, 29)}T08:00:00`))).toBeUndefined(); // past: no rough date
    expect(nextPeriod(s, ANCHOR, false)).toBeUndefined(); // not offered (a baby in the household)
  });

  it('a custom usual length moves the rough estimate; it stays within 21 to 45 days', () => {
    const start = addDaysISO(today, -11);
    let s = startCycleFrom(blank(), start, ANCHOR);
    s = setUsualCycleLength(s, 32);
    expect(nextPeriod(s, ANCHOR)).toMatchObject({ date: addDaysISO(start, 32), days: 21, basis: 'usual', length: 32 });
    expect(setUsualCycleLength(s, 14).her.cycle.usualLength).toBe(21);
    expect(setUsualCycleLength(s, 60).her.cycle.usualLength).toBe(45);
    // Shorter than the days already passed: no rough date rather than one in the past.
    expect(nextPeriod(setUsualCycleLength(s, 21), new Date(`${addDaysISO(start, 22)}T08:00:00`))).toBeUndefined();
  });

  it('once two cycles are logged, the estimate comes from them and ignores the usual length', () => {
    const d7 = setUsualCycleLength(buildPersona('D7'), 40);
    const next = nextPeriod(d7, ANCHOR)!;
    expect(next).toMatchObject({ basis: 'history', cycles: 3, days: 17 });
  });
});
