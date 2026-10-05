import { addLog, endContraction, startContraction, startLabour } from '../domain/transitions';
import { buildPersona, ANCHOR } from '../state/personas';
import { runInsights } from './engine';
import { R05, R09, R12, R13, RULES } from './rules';

const at = (h: number, m = 0) => { const d = new Date(ANCHOR); d.setHours(h, m, 0, 0); return d; };

describe('R05: under six hours four nights running', () => {
  it('fires for D1 (seeded short nights)', () => {
    const out = runInsights([R05], { state: buildPersona('D1'), now: ANCHOR });
    expect(out[0]?.headline).toBe('You’ve slept under six hours four nights running.');
  });
  it('stays quiet if one of the four nights was six hours or more', () => {
    let s = buildPersona('D1');
    s = { ...s, logs: s.logs.filter((l) => !(l.type === 'sleep' && l.subject.kind === 'her' && l.at.startsWith(ANCHOR.toISOString().slice(0, 10)))) };
    const start = new Date(at(6, 35).getTime() - 7 * 3600_000);
    s = addLog(s, { kind: 'her' }, { type: 'sleep', start: start.toISOString(), end: at(6, 35).toISOString() }, at(6, 35), 'sheet').state;
    expect(R05.evaluate({ state: s, now: ANCHOR })).toEqual([]);
  });
  it('stays quiet with missing nights (no data is not short sleep)', () => {
    expect(R05.evaluate({ state: buildPersona('D2'), now: ANCHOR })).toEqual([]);
  });
});

describe('R09: dose not logged well after its time', () => {
  it('is quiet in the morning when breakfast doses are ticked', () => {
    expect(R09.evaluate({ state: buildPersona('D1'), now: ANCHOR })).toEqual([]);
  });
  it('appears 90 minutes after dinner (20:30) and names the first missed dose', () => {
    expect(R09.evaluate({ state: buildPersona('D1'), now: at(21, 59) })).toEqual([]);
    const [c] = R09.evaluate({ state: buildPersona('D1'), now: at(22, 0) });
    const [i] = runInsights([R09], { state: buildPersona('D1'), now: at(22, 0) });
    expect(i!.headline).toBe('Evening dose of Cipcal XT not logged yet.');
    expect(c!.effects).toEqual(['log_dose:med_cipcal:dinner']);
  });
  it('clears once the dose is logged', () => {
    let s = buildPersona('D1');
    for (const id of ['med_cipcal', 'med_ferrogen']) s = addLog(s, { kind: 'her' }, { type: 'dose', medicineId: id, takenAt: at(22).toISOString(), slot: 'dinner' }, at(22), 'quick').state;
    expect(R09.evaluate({ state: s, now: at(22, 5) })).toEqual([]);
  });
});

describe('R12: practice contractions shortening (week 37+)', () => {
  it('fires for D2 with spelled-out numbers and a Start Labour mode action', () => {
    const [i] = runInsights([R12], { state: buildPersona('D2'), now: ANCHOR });
    expect(i!.headline).toBe('Your practice contractions moved from eleven minutes apart to seven over the last two days.');
    expect(i!.actions[0]).toEqual({ label: 'Start Labour mode', effect: 'start_labour' });
  });
  it('stays quiet before week 37 and once Labour mode is running', () => {
    const d2 = buildPersona('D2');
    const early = { ...d2, her: { ...d2.her, pregnancy: { ...d2.her.pregnancy!, dueDate: '2026-10-20' } } };
    expect(R12.evaluate({ state: early, now: ANCHOR })).toEqual([]);
    expect(R12.evaluate({ state: startLabour(d2, ANCHOR), now: ANCHOR })).toEqual([]);
  });
});

describe('R13: all three signs met in Labour mode', () => {
  it('escalates, ranks first and cannot be snoozed', () => {
    let s = startLabour(buildPersona('D2'), new Date(ANCHOR.getTime() - 80 * 60_000));
    for (let i = 0; i < 16; i++) {
      const start = new Date(ANCHOR.getTime() - (16 - i) * 270_000);
      s = endContraction(startContraction(s, start), new Date(start.getTime() + 62_000));
    }
    const out = runInsights(RULES, { state: s, now: new Date(ANCHOR.getTime() - 200_000) });
    expect(out[0]).toMatchObject({ ruleId: 'R13', severity: 'escalate' });
    expect(out[0]!.actions[0]).toEqual({ label: 'Call your provider', effect: 'call_provider' });
  });
  it('is quiet with one of three signs', () => {
    let s = startLabour(buildPersona('D2'), new Date(ANCHOR.getTime() - 40 * 60_000));
    for (let i = 0; i < 7; i++) {
      const start = new Date(ANCHOR.getTime() - (8 - i) * 256_000);
      s = endContraction(startContraction(s, start), new Date(start.getTime() + 39_000));
    }
    expect(R13.evaluate({ state: s, now: ANCHOR })).toEqual([]);
  });
});

it('catalogue contains the rules built so far', () => {
  expect(RULES.map((r) => r.id)).toEqual(['R05', 'R09', 'R12', 'R13']);
});
