import { buildPersona, ANCHOR } from '../state/personas';
import { cycleDay, cycleDayNumber, cycleLengths, cycleTimeline, endPeriod, FERTILE_DAYS_BEFORE, LUTEAL_DAYS, logPeriodDay, nextPeriodEstimate, periodRuns, periodStarts, removePeriodDay } from './cycle';
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

describe('cycle estimates: ovulation, fertile window, predictions (9.8)', () => {
  const d5 = () => buildPersona('D5').her.cycle.periodDays!;

  it('nothing is estimated before two cycles are complete (D4)', () => {
    const days = buildPersona('D4').her.cycle.periodDays!;
    expect(cycleTimeline(days, ANCHOR)).toBeUndefined();
    expect(cycleDay(undefined, days, '2026-08-26')).toEqual({ period: 'logged', fertile: false, ovulation: false });
  });

  it('D5: six past cycles, the current one, and predictions through November', () => {
    const tl = cycleTimeline(d5(), ANCHOR)!;
    expect(tl).toMatchObject({ averageLength: 29, averagePeriod: 5, shortest: 27, longest: 30, nextStart: '2026-09-23' });
    expect(tl.cycles.map((c) => c.kind)).toEqual(['past', 'past', 'past', 'past', 'past', 'past', 'current', 'predicted', 'predicted', 'predicted']);
    expect(tl.cycles.filter((c) => c.kind === 'predicted').map((c) => c.start)).toEqual(['2026-09-23', '2026-10-22', '2026-11-20']);
  });

  it('ovulation is estimated fourteen days before the next start; the fertile window is the five days before it and the day itself', () => {
    const tl = cycleTimeline(d5(), ANCHOR)!;
    const july = tl.cycles.find((c) => c.start === '2026-07-28')!;
    expect(LUTEAL_DAYS).toBe(14);
    expect(FERTILE_DAYS_BEFORE).toBe(5);
    expect(july).toMatchObject({ kind: 'past', length: 28, ovulation: '2026-08-11', fertileStart: '2026-08-06', fertileEnd: '2026-08-11' });
    const current = tl.cycles.find((c) => c.kind === 'current')!;
    expect(current).toMatchObject({ start: '2026-08-25', ovulation: '2026-09-09', fertileStart: '2026-09-04', fertileEnd: '2026-09-09' });
  });

  it('calendar days: logged period wins; predicted period, fertile and ovulation days are marked', () => {
    const days = d5();
    const tl = cycleTimeline(days, ANCHOR)!;
    expect(cycleDay(tl, days, '2026-08-26')).toEqual({ period: 'logged', fertile: false, ovulation: false });
    expect(cycleDay(tl, days, '2026-09-23')).toEqual({ period: 'predicted', fertile: false, ovulation: false });
    expect(cycleDay(tl, days, '2026-09-27')).toMatchObject({ period: 'predicted' });
    expect(cycleDay(tl, days, '2026-09-28')).toMatchObject({ period: undefined });
    expect(cycleDay(tl, days, '2026-09-06')).toEqual({ period: undefined, fertile: true, ovulation: false });
    expect(cycleDay(tl, days, '2026-09-09')).toEqual({ period: undefined, fertile: true, ovulation: true });
    expect(cycleDay(tl, days, '2026-09-10')).toEqual({ period: undefined, fertile: false, ovulation: false });
  });

  it('cycle day counts from the latest start', () => {
    expect(cycleDayNumber(d5(), ANCHOR)).toBe(3);
    expect(cycleDayNumber(d5(), new Date(2026, 8, 10, 9, 0))).toBe(17);
  });

  it('predictions follow the clock: later in the year they reach three months further', () => {
    const s = buildPersona('D5', new Date(2026, 10, 2, 10, 30));
    const tl = cycleTimeline(s.her.cycle.periodDays!, new Date(2026, 10, 2, 10, 30))!;
    const last = tl.cycles.filter((c) => c.kind === 'predicted').at(-1)!;
    expect(last.start >= '2027-02-01' && last.start <= '2027-02-28').toBe(true);
  });
});
