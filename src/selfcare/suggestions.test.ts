import { ANCHOR, buildPersona } from '../state/personas';
import { addLog, emptyState } from '../domain/transitions';
import { connectDevice } from '../domain/devices';
import { lintText } from '../insights/copyLint';
import type { DomainState } from '../domain/types';
import { MAX_SUGGESTIONS, suggestionsFor } from './suggestions';

const ids = (s: DomainState, at = ANCHOR) => suggestionsFor(s, at).map((x) => x.id);
const at = (h: number, m = 0) => new Date(2026, 7, 27, h, m);

describe('self-care suggestions (decision 2026-10-30)', () => {
  it('every persona gets one to three, each saying why, flagged for clinical review, in plain copy', () => {
    for (const id of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] as const) {
      const list = suggestionsFor(buildPersona(id), ANCHOR);
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
      for (const sg of list) {
        expect(sg.why).not.toMatch(/\{/);
        expect(sg.review?.kind).toBe('clinical');
        expect([...lintText(sg.id, sg.title, 'title'), ...lintText(sg.id, sg.body, 'body')]).toEqual([]);
      }
    }
  });

  it('early in a period, warmth for cramps comes first', () => {
    const list = suggestionsFor(buildPersona('D5'), ANCHOR); // period day 3
    expect(list[0]!.id).toBe('cramps');
    expect(list[0]!.why).toBe('day 3 of your period');
  });

  it('a short night: rest when the baby sleeps for a mother, an easier evening otherwise', () => {
    expect(ids(buildPersona('D3'))).toContain('rest');
    const s = addLog(emptyState('Asha', 'cycle_tracking'), { kind: 'her' }, { type: 'sleep', start: at(1, 30).toISOString(), end: at(6, 0).toISOString() }, at(6, 0), 'sheet').state;
    const list = suggestionsFor(s, at(9));
    expect(list[0]!.id).toBe('wind-down');
    expect(list[0]!.why).toBe('you slept 4h 30m last night');
  });

  it('low or flat mood today brings something gentle', () => {
    const s = addLog(emptyState('Asha', 'cycle_tracking'), { kind: 'her' }, { type: 'mood', value: 'low' }, at(9), 'quick').state;
    expect(ids(s, at(9, 5))).toContain('mood');
  });

  it('water behind the day’s pace offers a glass, with one tap to log it', () => {
    const s = emptyState('Asha', 'cycle_tracking');
    expect(ids(s, at(8))).not.toContain('water'); // early: nothing to catch up yet
    const water = suggestionsFor(s, at(18)).find((x) => x.id === 'water')!;
    expect(water.why).toBe('0 of 8 glasses so far today');
    expect(water.action).toEqual({ label: 'Add a glass', kind: 'water' });
  });

  it('postpartum: a pelvic floor set until the week’s target is met, and no walk nudge in the first six weeks', () => {
    const s = connectDevice(buildPersona('D3'), 'fitbit', ANCHOR);
    const list = suggestionsFor(s, ANCHOR);
    expect(list.map((x) => x.id)).toContain('pelvic');
    expect(list.find((x) => x.id === 'pelvic')!.action).toMatchObject({ kind: 'route', to: '/me/pelvic' });
    expect(list.map((x) => x.id)).not.toContain('walk');
  });

  it('late pregnancy: feet up', () => {
    expect(ids(buildPersona('D2'))).toContain('feet-up');
    expect(ids(buildPersona('D1'))).not.toContain('feet-up'); // week 22
  });

  it('a period due within three days', () => {
    const d7 = buildPersona('D7'); // next period around 13 September
    expect(ids(d7)).not.toContain('period-soon');
    expect(ids(d7, new Date(2026, 8, 11, 9))).toContain('period-soon');
  });

  it('with nothing else to say, a moment for herself', () => {
    expect(ids(emptyState('Asha', 'cycle_tracking'), at(8))).toEqual(['breathe']);
  });
});
