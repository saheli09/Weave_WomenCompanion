import { abandonLog, beginLog, commitLog, summarise, toCSV, useMetrics } from './timeToLog';

const tap = () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));

describe('time-to-log instrumentation (16.6)', () => {
  beforeEach(() => useMetrics.getState().clear());

  it('counts the entry tap plus every tap until save', () => {
    beginLog('today.child.diaper'); // tap 1 (entry)
    tap(); // tap 2: "Wet"
    commitLog('diaper');
    const [t] = useMetrics.getState().timings;
    expect(t).toMatchObject({ action: 'diaper', entry: 'today.child.diaper', taps: 2, outcome: 'saved' });
    expect(t!.ms).toBeGreaterThanOrEqual(0);
  });

  it('records instant one-tap logs', () => {
    commitLog('water', 'today.her.water');
    expect(useMetrics.getState().timings[0]).toMatchObject({ action: 'water', taps: 1 });
  });

  it('records abandoned sessions separately', () => {
    beginLog('fab');
    tap();
    abandonLog('feed_breast');
    expect(useMetrics.getState().timings[0]).toMatchObject({ outcome: 'abandoned', taps: 2 });
  });

  it('summarises medians, p90 and share under ten seconds', () => {
    const base = { entry: 'x', at: '', persona: 'D3', outcome: 'saved' as const };
    const s = summarise([
      { ...base, action: 'feed_breast', ms: 4000, taps: 3 },
      { ...base, action: 'feed_breast', ms: 6000, taps: 4 },
      { ...base, action: 'feed_breast', ms: 12000, taps: 5 },
      { ...base, action: 'feed_breast', ms: 9000, taps: 2, outcome: 'abandoned' },
    ]);
    expect(s[0]).toMatchObject({ saved: 3, abandoned: 1, medianMs: 6000, medianTaps: 4, maxTaps: 5 });
    expect(s[0]!.under10s).toBeCloseTo(2 / 3);
    expect(toCSV([{ ...base, action: 'water', ms: 300, taps: 1 }]).split('\n')).toHaveLength(2);
  });
});
