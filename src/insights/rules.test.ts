import { addLog, closeFormulaPack, endContraction, startContraction, startLabour } from '../domain/transitions';
import { buildPersona, ANCHOR } from '../state/personas';
import { runInsights } from './engine';
import { R01, R02, R03, R04, R05, R06, R09, R10, R12, R13, R14, R15, R16, R17, RULES } from './rules';
import { snoozeInsight } from './engine';

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

describe('R01: three feeds since 5am and no water (D3)', () => {
  it('fires with the Figma copy and a Log a glass action', () => {
    const [i] = runInsights([R01], { state: buildPersona('D3'), now: ANCHOR });
    expect(i!.headline).toBe('Three feeds logged since 5am, and no water yet today.');
    expect(i!.actions[0]).toEqual({ label: 'Log a glass', effect: 'log_water' });
  });
  it('clears after one glass', () => {
    const s = addLog(buildPersona('D3'), { kind: 'her' }, { type: 'water', glasses: 1 }, ANCHOR, 'quick').state;
    expect(R01.evaluate({ state: s, now: ANCHOR })).toEqual([]);
  });
  it('needs three feeds since 5am', () => {
    expect(R01.evaluate({ state: buildPersona('D3'), now: at(7, 10) })).toEqual([]);
  });
});

describe('R02: below half the water goal by mid-afternoon', () => {
  it('is quiet before 15:00 and when R01 already speaks', () => {
    expect(R02.evaluate({ state: buildPersona('D4'), now: ANCHOR })).toEqual([]);
    expect(R02.evaluate({ state: buildPersona('D3'), now: at(15, 30) })).toEqual([]);
  });
  it('fires at 15:30 with two of eight glasses (D4)', () => {
    const [i] = runInsights([R02], { state: buildPersona('D4'), now: at(15, 30) });
    expect(i!.headline).toBe('Two of eight glasses so far today.');
  });
  it('is quiet at half the goal', () => {
    let s = buildPersona('D4');
    for (let n = 0; n < 2; n++) s = addLog(s, { kind: 'her' }, { type: 'water', glasses: 1 }, at(12), 'quick').state;
    expect(R02.evaluate({ state: s, now: at(15, 30) })).toEqual([]);
  });
});

describe('R14: heavy bleeding in the postpartum window', () => {
  it('escalates straight after a Heavy log, first in the carousel, provider action', () => {
    const s = addLog(buildPersona('D3'), { kind: 'her' }, { type: 'bleeding', level: 'heavy' }, ANCHOR, 'quick').state;
    const out = runInsights(RULES, { state: s, now: ANCHOR });
    expect(out[0]).toMatchObject({ ruleId: 'R14', severity: 'escalate', topic: 'heavy bleeding' });
    expect(out[0]!.actions[0]!.effect).toBe('call_provider');
  });
  it('is quiet for other levels, after 24 hours, and outside the window', () => {
    expect(R14.evaluate({ state: buildPersona('D3'), now: ANCHOR })).toEqual([]);
    const s = addLog(buildPersona('D3'), { kind: 'her' }, { type: 'bleeding', level: 'heavy' }, ANCHOR, 'quick').state;
    expect(R14.evaluate({ state: s, now: new Date(ANCHOR.getTime() + 25 * 3600_000) })).toEqual([]);
    const toddler = addLog(buildPersona('D5'), { kind: 'her' }, { type: 'bleeding', level: 'heavy' }, ANCHOR, 'quick').state;
    expect(R14.evaluate({ state: toddler, now: ANCHOR })).toEqual([]);
  });
});

describe('R16 and R17: formula tin reminders (9.15)', () => {
  const day = (n: number) => new Date(ANCHOR.getTime() + n * 864e5);
  // D5 tin: opened 18 July, discard by 1 September, five days left at the anchor.
  it('seven days before, three days before and on the day, with the day count', () => {
    const s = buildPersona('D5');
    expect(R16.evaluate({ state: s, now: day(-3) })).toEqual([]); // eight days left
    expect(runInsights([R16], { state: s, now: day(-2) })[0]!.body).toBe('Opened 18 July. Seven days left.');
    const [i] = runInsights([R16], { state: s, now: ANCHOR });
    expect(i!.headline).toBe('The open formula tin is due to be discarded by 1 September.');
    expect(i!.body).toBe('Opened 18 July. Five days left.');
    expect(runInsights([R16], { state: s, now: day(2) })[0]!.body).toBe('Opened 18 July. Three days left.');
    expect(runInsights([R16], { state: s, now: day(4) })[0]!.body).toBe('Opened 18 July. One day left.');
    const [due] = runInsights([R16], { state: s, now: day(5) });
    expect(due!.headline).toBe('The open formula tin is due to be discarded today.');
    expect(due!.body).toBe('Opened 18 July.');
  });
  it('dates and the day count come from the tin and the clock, not fixed text', () => {
    const s = buildPersona('D5', new Date(2026, 9, 7, 10, 30)); // same persona seeded on 7 October
    const [i] = runInsights([R16], { state: s, now: new Date(2026, 9, 7, 10, 30) });
    expect(i!.headline).toBe('The open formula tin is due to be discarded by 12 October.');
    expect(i!.body).toBe('Opened 28 August. Five days left.');
  });
  it('after the date: R17 until acted on; a 24 hour snooze holds then returns', () => {
    const s = buildPersona('D5');
    expect(R16.evaluate({ state: s, now: day(6) })).toEqual([]);
    const [i] = runInsights([R17], { state: s, now: day(6) });
    expect(i!.headline).toBe('The open formula tin has passed its discard date.');
    expect(i!.body).toBe('Opened 18 July. Due to be discarded by 1 September.');
    expect(i!.actions.map((a) => a.label)).toEqual(['Mark discarded', 'Mark finished', 'Not now']);
    const snoozed = snoozeInsight(s, i!.id, day(6));
    expect(runInsights([R17], { state: snoozed, now: day(6.5) })).toEqual([]);
    expect(runInsights([R17], { state: snoozed, now: day(7.1) })).toHaveLength(1);
  });
  it('marking the tin finished or discarded clears both', () => {
    const s = closeFormulaPack(buildPersona('D5'), 'tin_1', 'discarded', day(6));
    expect([...R16.evaluate({ state: s, now: ANCHOR }), ...R17.evaluate({ state: s, now: day(6) })]).toEqual([]);
  });
  it('D3 (tin opened ten days ago) gets no reminder; exclusively breastfed D4 never does', () => {
    expect(R16.evaluate({ state: buildPersona('D3'), now: ANCHOR })).toEqual([]);
    expect(R16.evaluate({ state: buildPersona('D4'), now: day(60) })).toEqual([]);
  });
});

describe('R06: compared with the child’s own recent days only', () => {
  it('D3: feeds closer together today than her seven-day average', () => {
    const [i] = runInsights([R06], { state: buildPersona('D3'), now: ANCHOR });
    expect(i!.headline).toBe('Feeds are closer together today than Srinika’s recent average.');
    expect(i!.body).toBe('Compared with Srinika’s own recent days only.');
  });
  it('quiet without a week of history, and for toddlers', () => {
    const s = buildPersona('D3');
    const noHistory = { ...s, logs: s.logs.filter((l) => l.at >= new Date(ANCHOR.getTime() - 864e5).toISOString()) };
    expect(R06.evaluate({ state: noHistory, now: ANCHOR })).toEqual([]);
    expect(R06.evaluate({ state: buildPersona('D5'), now: ANCHOR })).toEqual([]);
  });
});

describe('R04: bleeding eased for three days', () => {
  it('D3: spotting for three days after light', () => {
    const [i] = runInsights([R04], { state: buildPersona('D3'), now: ANCHOR });
    expect(i!.headline).toBe('Spotting has eased for three days.');
    expect(i!.body).toBeUndefined();
  });
  it('quiet if today is heavier, or outside postpartum', () => {
    const s = addLog(buildPersona('D3'), { kind: 'her' }, { type: 'bleeding', level: 'light' }, ANCHOR, 'quick').state;
    expect(R04.evaluate({ state: s, now: ANCHOR })).toEqual([]);
    expect(R04.evaluate({ state: buildPersona('D1'), now: ANCHOR })).toEqual([]);
  });
});

describe('R10: pelvic floor below the weekly target', () => {
  it('D3 Thursday: two of five', () => {
    expect(runInsights([R10], { state: buildPersona('D3'), now: ANCHOR })[0]!.headline).toBe('Two of five pelvic floor sets this week.');
  });
  it('quiet early in the week and at the target', () => {
    expect(R10.evaluate({ state: buildPersona('D3'), now: new Date(2026, 7, 25, 10) })).toEqual([]); // Tuesday
    let s = buildPersona('D3');
    for (let i = 0; i < 3; i++) s = addLog(s, { kind: 'her' }, { type: 'pelvic_floor', sets: 1 }, ANCHOR, 'quick').state;
    expect(R10.evaluate({ state: s, now: ANCHOR })).toEqual([]);
  });
});

describe('R15: low mood three days running (postpartum)', () => {
  const low = (s: ReturnType<typeof buildPersona>, back: number) => addLog(s, { kind: 'her' }, { type: 'mood', value: 'low' }, new Date(ANCHOR.getTime() - back * 864e5 - 3600_000), 'quick').state;
  it('escalates to support, provider-first', () => {
    const s = low(low(low(buildPersona('D3'), 0), 1), 2);
    const [i] = runInsights(RULES, { state: s, now: ANCHOR });
    expect(i).toMatchObject({ ruleId: 'R15', severity: 'escalate' });
    expect(i!.body).toMatch(/provider/);
  });
  it('quiet with two low days, or a better mood logged later today', () => {
    expect(R15.evaluate({ state: low(low(buildPersona('D3'), 0), 1), now: ANCHOR })).toEqual([]);
    const s = addLog(low(low(low(buildPersona('D3'), 0), 1), 2), { kind: 'her' }, { type: 'mood', value: 'ok' }, ANCHOR, 'quick').state;
    expect(R15.evaluate({ state: s, now: new Date(ANCHOR.getTime() + 1000) })).toEqual([]);
  });
});

describe('R03: early period days and water', () => {
  it('D5 period day 3 with one glass', () => {
    expect(runInsights([R03], { state: buildPersona('D5'), now: ANCHOR })[0]!.headline).toBe('Day three of your period, and one glass so far today.');
  });
  it('quiet from day four and without cycle tracking', () => {
    expect(R03.evaluate({ state: buildPersona('D5'), now: new Date(ANCHOR.getTime() + 864e5) })).toEqual([]);
    expect(R03.evaluate({ state: buildPersona('D3'), now: ANCHOR })).toEqual([]);
  });
});

it('catalogue contains the rules built so far', () => {
  expect(RULES.map((r) => r.id)).toEqual(['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R09', 'R10', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17']);
});
