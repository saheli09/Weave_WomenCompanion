import { formatClock, formatSeconds, labourStats, practiceGapsByDay, LABOUR_CONFIG } from './labour';
import { buildPersona, ANCHOR } from '../state/personas';
import type { Contraction } from './types';

const now = new Date('2026-08-27T10:30:00');
/** n contractions ending at `now - endAgoMin`, every gapSec, each durSec long. */
function series(n: number, gapSec: number, durSec: number, endAgoSec = 60): Contraction[] {
  const lastStart = now.getTime() - endAgoSec * 1000;
  return Array.from({ length: n }, (_, i) => {
    const start = lastStart - (n - 1 - i) * gapSec * 1000;
    return { start: new Date(start).toISOString(), end: new Date(start + durSec * 1000).toISOString() };
  });
}

describe('labour stats (9.6)', () => {
  it('handles no contractions', () => {
    const s = labourStats([], now);
    expect(s).toMatchObject({ count: 0, signsMet: 0, holdingMin: 0, bars: [] });
    expect(s.sinceLastSec).toBeUndefined();
  });

  it('averages gaps start to start and durations within the last hour', () => {
    const s = labourStats(series(7, 256, 39), now);
    expect(s.count).toBe(7);
    expect(s.avgGapSec).toBeCloseTo(256);
    expect(s.avgDurationSec).toBeCloseTo(39);
    expect(s.sinceLastSec).toBeCloseTo(60);
    expect(s.signs).toEqual({ apart: true, lasting: false, holding: false });
    expect(s.signsMet).toBe(1);
  });

  it('all three signs: five minutes apart, a minute long, for an hour', () => {
    const s = labourStats(series(16, 270, 62), now); // 15 gaps x 4.5 min = 67.5 min
    expect(s.signs).toEqual({ apart: true, lasting: true, holding: true });
    expect(s.holdingMin).toBeGreaterThanOrEqual(LABOUR_CONFIG.holdMin);
  });

  it('holding resets after a long gap, and lapses if the latest contraction is old', () => {
    const early = series(6, 240, 60, 60 * 60);
    const late = series(4, 240, 60, 60);
    expect(labourStats([...early, ...late], now).holdingMin).toBeCloseTo(12);
    expect(labourStats(series(16, 270, 62, 10 * 60), now).holdingMin).toBe(0);
  });

  it('reports a running contraction without counting it in durations', () => {
    const c = [...series(3, 300, 60, 400), { start: new Date(now.getTime() - 20_000).toISOString() }];
    const s = labourStats(c, now);
    expect(s.running).toBeDefined();
    expect(s.sinceLastSec).toBeCloseTo(20);
    expect(s.bars).toHaveLength(3);
  });

  it('formats', () => {
    expect(formatSeconds(256)).toBe('4m 16s');
    expect(formatSeconds(39)).toBe('39s');
    expect(formatClock(184)).toBe('3:04');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});

describe('practice contraction gaps (R12)', () => {
  it('D2 shows gaps shortening from eleven to seven minutes over three days', () => {
    const d = practiceGapsByDay(buildPersona('D2').logs, ANCHOR);
    expect(d.map((x) => Math.round(x.avgGapMin))).toEqual([11, 9, 7]);
  });
});
