import { buildPersona, ANCHOR } from '../state/personas';
import { acknowledgeInsight, runInsights, snoozeInsight, type Rule } from './engine';

const ctx = () => ({ state: buildPersona('D3'), now: ANCHOR });
const rule = (id: string, cands: Parameters<Rule['evaluate']> extends never ? never : ReturnType<Rule['evaluate']>): Rule => ({ id, evaluate: () => cands });

describe('insight engine ranking (11.1)', () => {
  const info = (id: string, template: 'R02' | 'R05' | 'R10' | 'R16' | 'R04', priority: number, at = ANCHOR.toISOString()) => ({ id, template, scope: 'her' as const, priority, at });

  it('puts escalations first, then priority, then recency, capped at four', () => {
    const rules = [
      rule('a', [info('R02', 'R02', 1), info('R05', 'R05', 5), info('R10', 'R10', 3), info('R16', 'R16', 3, '2026-08-27T11:00:00.000Z'), info('R04', 'R04', 2)]),
      rule('b', [{ id: 'R14:x', template: 'R14', scope: 'her', priority: 0, at: ANCHOR.toISOString() }]),
    ];
    const out = runInsights(rules, ctx());
    expect(out.map((i) => i.id)).toEqual(['R14:x', 'R05', 'R16', 'R10']);
    expect(out[0]!.severity).toBe('escalate');
  });

  it('"Not now" hides an info card for 24 hours, then it can return', () => {
    const rules = [rule('a', [info('R02', 'R02', 1)])];
    const c = ctx();
    const snoozed = { ...c, state: snoozeInsight(c.state, 'R02', ANCHOR) };
    expect(runInsights(rules, snoozed)).toEqual([]);
    expect(runInsights(rules, { ...snoozed, now: new Date(ANCHOR.getTime() + 24 * 3600_000 + 1) })).toHaveLength(1);
  });

  it('escalations ignore snoozes and can only be acknowledged', () => {
    const rules = [rule('b', [{ id: 'R14:x', template: 'R14', scope: 'her', priority: 0, at: ANCHOR.toISOString() }])];
    const c = ctx();
    const snoozed = { ...c, state: snoozeInsight(c.state, 'R14:x', ANCHOR) };
    expect(runInsights(rules, snoozed)).toHaveLength(1);
    const ack = { ...c, state: acknowledgeInsight(c.state, 'R14:x', ANCHOR) };
    expect(runInsights(rules, ack)[0]!.acknowledged).toBe(true);
  });

  it('fills templates with spelled-out values and keeps action effects', () => {
    const rules = [rule('a', [{ id: 'R01', template: 'R01', scope: 'both', priority: 5, at: ANCHOR.toISOString(), params: { Count: 'Three', time: '5am' }, effects: ['log_water'] }])];
    const [i] = runInsights(rules, ctx());
    expect(i!.headline).toBe('Three feeds logged since 5am, and no water yet today.');
    expect(i!.actions[0]).toEqual({ label: 'Log a glass', effect: 'log_water' });
  });
});

describe('quiet period after a pregnancy ends (9.10)', () => {
  it('shows no info insights for fourteen days, but still shows escalations', async () => {
    const { endPregnancy } = await import('../domain/transitions');
    const s = endPregnancy(buildPersona('D1'), ANCHOR, true);
    const rules = [
      rule('a', [{ id: 'R05', template: 'R05', scope: 'her', priority: 1, at: ANCHOR.toISOString() }]),
      rule('b', [{ id: 'R14:x', template: 'R14', scope: 'her', priority: 0, at: ANCHOR.toISOString() }]),
    ];
    expect(runInsights(rules, { state: s, now: ANCHOR }).map((i) => i.id)).toEqual(['R14:x']);
    expect(runInsights(rules, { state: s, now: new Date(ANCHOR.getTime() + 15 * 864e5) })).toHaveLength(2);
  });
});
