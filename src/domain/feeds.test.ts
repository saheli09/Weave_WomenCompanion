import { buildPersona, ANCHOR } from '../state/personas';
import { checkInvariants } from './transitions';
import { discardBreastSession, lastBottle, lastBreastSide, lastFeedType, logBottle, logCombo, saveBreastSession, sessionSeconds, setBreastMinutes, toggleBreastSide } from './feeds';

const C = 'child_srinika';
const t = (sec: number) => new Date(ANCHOR.getTime() + sec * 1000);

describe('breastfeed session (S07)', () => {
  it('times sides from timestamps, switching banks the other side', () => {
    let s = toggleBreastSide(buildPersona('D3'), C, 'left', t(0));
    expect(sessionSeconds(s.timers.breastfeed!, t(300)).left).toBe(300);
    s = toggleBreastSide(s, C, 'right', t(300));
    const sec = sessionSeconds(s.timers.breastfeed!, t(420));
    expect(sec).toEqual({ left: 300, right: 120, total: 420 });
    expect(s.timers.breastfeed!.running!.side).toBe('right');
  });

  it('tapping the running side stops it', () => {
    let s = toggleBreastSide(buildPersona('D3'), C, 'left', t(0));
    s = toggleBreastSide(s, C, 'left', t(60));
    expect(s.timers.breastfeed!.running).toBeUndefined();
    expect(s.timers.breastfeed!.leftSec).toBe(60);
  });

  it('survives serialisation (reload) because it stores timestamps', () => {
    const s = JSON.parse(JSON.stringify(toggleBreastSide(buildPersona('D3'), C, 'left', t(0))));
    expect(sessionSeconds(s.timers.breastfeed, t(600)).left).toBe(600);
  });

  it('saves one grouped entry per side, at the session start, and clears the timer', () => {
    let s = toggleBreastSide(buildPersona('D3'), C, 'left', t(0));
    s = toggleBreastSide(s, C, 'right', t(10 * 60 + 20));
    const r = saveBreastSession(s, t(15 * 60), 'sleepy');
    expect(r.entries.map((e) => (e.type === 'feed' && e.mode === 'breast' ? [e.side, e.minutes] : null))).toEqual([['left', 10], ['right', 5]]);
    expect(new Set(r.entries.map((e) => e.groupId)).size).toBe(1);
    expect(r.entries[0]!.at).toBe(ANCHOR.toISOString());
    expect(r.state.timers.breastfeed).toBeUndefined();
    expect(checkInvariants(r.state)).toEqual([]);
    expect(lastBreastSide(r.state, C, t(16 * 60))).toBe('right');
  });

  it('manual minutes with the pencil, without a timer', () => {
    const s = setBreastMinutes(buildPersona('D3'), C, 'right', 12, ANCHOR);
    const r = saveBreastSession(s, ANCHOR);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]).toMatchObject({ side: 'right', minutes: 12 });
  });

  it('refuses to save nothing, and discard clears', () => {
    const s = toggleBreastSide(buildPersona('D3'), C, 'left', t(0));
    expect(() => saveBreastSession(setBreastMinutes(s, C, 'left', 0, t(1)), t(1))).toThrow();
    expect(discardBreastSession(s).timers.breastfeed).toBeUndefined();
  });

  it('a short feed under 30 seconds still logs a minute', () => {
    const s = toggleBreastSide(buildPersona('D3'), C, 'left', t(0));
    expect(saveBreastSession(s, t(20)).entries[0]).toMatchObject({ minutes: 1 });
  });
});

describe('bottle and combo (B04, B05)', () => {
  it('prefills from the last bottle; last-used type follows the latest feed', () => {
    const s = buildPersona('D3');
    expect(lastBottle(s, C)).toEqual({ ml: 60, content: 'formula' });
    expect(lastFeedType(s, C, ANCHOR)).toBe('breast');
    const b = logBottle(s, C, 90, 'expressed', t(60)).state;
    expect(lastFeedType(b, C, t(61))).toBe('bottle');
    expect(lastBottle(b, C)).toEqual({ ml: 90, content: 'expressed' });
    expect(() => logBottle(s, C, 0, 'formula', t(60))).toThrow();
  });
  it('combo saves a grouped breast and bottle pair and reads back as combo', () => {
    const r = logCombo(buildPersona('D3'), C, { side: 'left', minutes: 8, ml: 60, content: 'formula' }, t(60));
    expect(r.entries).toHaveLength(2);
    expect(r.entries[0]!.groupId).toBe(r.entries[1]!.groupId);
    expect(lastFeedType(r.state, C, t(61))).toBe('combo');
  });
});
