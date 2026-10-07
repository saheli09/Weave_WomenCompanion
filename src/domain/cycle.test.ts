import { buildPersona, ANCHOR } from '../state/personas';
import { cycleLengths, endPeriod, logPeriodDay, nextPeriodEstimate, periodRuns, periodStarts, removePeriodDay } from './cycle';
import { currentPeriodDay } from './stage';
import { checkInvariants, TransitionError } from './transitions';

describe('cycle tracking (B25)', () => {
  it('D4: three period days, day 3 today; logging the next day continues the period', () => {
    let s = buildPersona('D4');
    expect(periodStarts(s.her.cycle.periodDays!)).toEqual(['2026-08-25']);
    s = logPeriodDay(s, '2026-08-27', 'light', ['cramps'], ANCHOR);
    expect(s.logs.filter((l) => l.type === 'period' && l.at.startsWith('2026-08-27')).length).toBeLessThanOrEqual(2);
    expect(currentPeriodDay(s, ANCHOR)).toBe(3);
    expect(checkInvariants(s)).toEqual([]);
  });
  it('a gap of more than a day starts a new period; End period stops the day count', () => {
    let s = buildPersona('D4');
    s = endPeriod(s, ANCHOR);
    expect(currentPeriodDay(s, ANCHOR)).toBeUndefined();
    const later = new Date('2026-09-22T10:00:00');
    s = logPeriodDay(s, '2026-09-22', 'medium', [], later);
    expect(s.her.cycle.lastPeriodStart).toBe('2026-09-22');
    expect(currentPeriodDay(s, later)).toBe(1);
  });
  it('no estimate until two cycles are complete, then the average', () => {
    const days = ['2026-06-01', '2026-06-02', '2026-06-30', '2026-07-01', '2026-07-29'];
    expect(cycleLengths(days)).toEqual([29, 29]);
    expect(nextPeriodEstimate(days)).toBe('2026-08-27');
    expect(nextPeriodEstimate(days.slice(0, 4))).toBeUndefined();
    expect(periodRuns(days).map((r) => r.length)).toEqual([2, 2, 1]);
  });
  it('refuses future days and logging while tracking is off; removing a day', () => {
    expect(() => logPeriodDay(buildPersona('D4'), '2026-08-30', 'light', [], ANCHOR)).toThrow(TransitionError);
    expect(() => logPeriodDay(buildPersona('D3'), '2026-08-27', 'light', [], ANCHOR)).toThrow(TransitionError);
    const s = removePeriodDay(buildPersona('D4'), '2026-08-27');
    expect(s.her.cycle.periodDays).toEqual(['2026-08-25', '2026-08-26']);
  });
});
