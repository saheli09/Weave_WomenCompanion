import { buildPersona, ANCHOR } from '../state/personas';
import { cancelSleep, endSleep, logPastSleep, startSleep } from './sleep';
import { checkInvariants, TransitionError, updateLog } from './transitions';

const C = { kind: 'child' as const, childId: 'child_srinika' };
const t = (min: number) => new Date(ANCHOR.getTime() + min * 60_000);

describe('sleep timer (B06)', () => {
  it('starts, survives serialisation, ends into a log', () => {
    let s = startSleep(buildPersona('D3'), C, t(0));
    s = JSON.parse(JSON.stringify(s));
    const r = endSleep(s, t(42));
    expect(r.entry).toMatchObject({ type: 'sleep', start: t(0).toISOString(), end: t(42).toISOString(), source: 'timer' });
    expect(r.state.timers.sleep).toBeUndefined();
    expect(checkInvariants(r.state)).toEqual([]);
  });
  it('one sleep at a time; cancel clears without a log', () => {
    const s = startSleep(buildPersona('D3'), C, t(0));
    expect(() => startSleep(s, C, t(1))).toThrow(TransitionError);
    expect(cancelSleep(s).logs.length).toBe(s.logs.length);
  });
  it('past sleep: validated', () => {
    const s = buildPersona('D3');
    expect(logPastSleep(s, C, t(-90), t(-30), ANCHOR).entry.type).toBe('sleep');
    expect(() => logPastSleep(s, C, t(-30), t(-90), ANCHOR)).toThrow();
    expect(() => logPastSleep(s, C, t(-30), t(30), ANCHOR)).toThrow();
    expect(() => logPastSleep(s, C, t(-20 * 60), t(-1), ANCHOR)).toThrow();
  });
});

describe('editing an older entry (10.3)', () => {
  it('changes time and value, never the type or subject', () => {
    const s = buildPersona('D3');
    const diaper = s.logs.find((l) => l.type === 'diaper')!;
    const e = updateLog(s, diaper.id, { kind: 'dirty', at: t(-5).toISOString(), note: 'after bath' } as never);
    expect(e.logs.find((l) => l.id === diaper.id)).toMatchObject({ kind: 'dirty', note: 'after bath', subject: diaper.subject });
    expect(() => updateLog(s, diaper.id, { type: 'water' } as never)).toThrow(TransitionError);
    const bottle = s.logs.find((l) => l.type === 'feed' && l.mode === 'bottle')!;
    expect(() => updateLog(s, bottle.id, { ml: 0 } as never)).toThrow(TransitionError);
  });
});
