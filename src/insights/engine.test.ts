import { buildPersona, ANCHOR } from '../state/personas';
import { acknowledgeInsight, byUrgency, runInsights, snoozeInsight, type Rule } from './engine';
import { RULES } from './rules';
import { closeFormulaPack } from '../domain/transitions';

const ctx = () => ({ state: buildPersona('D3'), now: ANCHOR });
const rule = (id: string, cands: Parameters<Rule['evaluate']> extends never ? never : ReturnType<Rule['evaluate']>): Rule => ({ id, evaluate: () => cands });

describe('insight engine ranking (11.1)', () => {
  const info = (id: string, template: 'R02' | 'R05' | 'R10' | 'R16' | 'R04', priority: number, at = ANCHOR.toISOString()) => ({ id, template, scope: 'her' as const, priority, at });

  it('ranks by urgency: escalations, then time-limited cards, then the rest; newest first within a group; capped at four', () => {
    const rules = [
      rule('a', [
        info('R05', 'R05', 9, '2026-08-27T05:00:00.000Z'),
        info('R10', 'R10', 1, '2026-08-27T04:00:00.000Z'),
        { ...info('R16', 'R16', 1, '2026-08-20T00:00:00.000Z'), timeLimited: true },
        info('R02', 'R02', 5, '2026-08-27T03:00:00.000Z'),
      ]),
      rule('b', [{ id: 'R14:x', template: 'R14', scope: 'her', priority: 0, at: '2026-08-26T00:00:00.000Z' }]),
    ];
    const out = runInsights(rules, ctx());
    // The tin card is the oldest and lowest priority, yet it outranks every untimed card.
    expect(out.map((i) => i.id)).toEqual(['R14:x', 'R16', 'R05', 'R10']);
    expect(out[0]!.severity).toBe('escalate');
  });

  it('within a group, ties on time fall back to priority', () => {
    const rules = [rule('a', [info('R02', 'R02', 1), info('R05', 'R05', 5)])];
    expect(runInsights(rules, ctx()).map((i) => i.id)).toEqual(['R05', 'R02']);
  });

  it('two time-limited cards: the newer one first', () => {
    const older = { ...info('R17', 'R16', 9, '2026-08-01T00:00:00.000Z'), timeLimited: true };
    const newer = { ...info('R16', 'R16', 1, '2026-08-25T00:00:00.000Z'), timeLimited: true };
    expect([older, newer].sort(byUrgency).map((c) => c.id)).toEqual(['R16', 'R17']);
  });

  it('D5: the formula reminder is the first card she sees, and leaves once the tin is closed', () => {
    const s = buildPersona('D5');
    const first = runInsights(RULES, { state: s, now: ANCHOR })[0]!;
    expect(first.ruleId).toBe('R16');
    const closed = closeFormulaPack(s, 'tin_1', 'finished', ANCHOR);
    expect(runInsights(RULES, { state: closed, now: ANCHOR }).some((i) => i.ruleId === 'R16' || i.ruleId === 'R17')).toBe(false);
  });

  it('D5: past the discard date the overdue card (R17) still ranks above everything untimed', () => {
    const later = new Date(ANCHOR.getTime() + 7 * 864e5);
    expect(runInsights(RULES, { state: buildPersona('D5'), now: later })[0]!.ruleId).toBe('R17');
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

describe('fewer like this and the Fewer setting (B32, B35)', () => {
  it('mutes a rule for a week; escalations cannot be muted', async () => {
    const { muteRule } = await import('./engine');
    const s = muteRule(muteRule(buildPersona('D3'), 'R05', ANCHOR), 'R14', ANCHOR);
    const rules = [
      rule('a', [{ id: 'R05', template: 'R05', scope: 'her', priority: 1, at: ANCHOR.toISOString() }]),
      rule('b', [{ id: 'R14:x', template: 'R14', scope: 'her', priority: 0, at: ANCHOR.toISOString() }]),
    ];
    expect(runInsights(rules, { state: s, now: ANCHOR }).map((i) => i.id)).toEqual(['R14:x']);
    expect(runInsights(rules, { state: s, now: new Date(ANCHOR.getTime() + 8 * 864e5) })).toHaveLength(2);
  });
  it('Fewer keeps the two most useful info cards, plus any escalation', () => {
    const base = buildPersona('D3');
    const s = { ...base, settings: { insightFrequency: 'fewer' as const, notifications: { doses: true, tins: true, insights: true }, sharing: { feeds: false, appointments: false, me: false } } };
    const info = (id: string, template: 'R02' | 'R05' | 'R10' | 'R04', priority: number) => ({ id, template, scope: 'her' as const, priority, at: ANCHOR.toISOString() });
    const rules = [rule('a', [info('R02', 'R02', 5), info('R05', 'R05', 4), info('R10', 'R10', 3), info('R04', 'R04', 1)])];
    expect(runInsights(rules, { state: s, now: ANCHOR }).map((i) => i.id)).toEqual(['R02', 'R05']);
  });
});

describe('settling in after onboarding (9.13)', () => {
  const cands = [
    { id: 'R10', template: 'R10' as const, scope: 'her' as const, priority: 1, at: ANCHOR.toISOString() },
    { id: 'R16', template: 'R16' as const, scope: 'her' as const, priority: 1, at: ANCHOR.toISOString(), timeLimited: true },
    { id: 'R14:x', template: 'R14' as const, scope: 'her' as const, priority: 0, at: ANCHOR.toISOString() },
  ];
  const joined = (daysAgo: number) => ({ ...buildPersona('D3'), startedAt: new Date(ANCHOR.getTime() - daysAgo * 864e5).toISOString() });

  it('holds back routine observations for her first three days; escalations and deadlines still show', () => {
    expect(runInsights([rule('a', cands)], { state: joined(1), now: ANCHOR }).map((i) => i.id)).toEqual(['R14:x', 'R16']);
  });

  it('shows everything once she has been using Weave for three days, and for sample data', () => {
    expect(runInsights([rule('a', cands)], { state: joined(3), now: ANCHOR }).map((i) => i.id)).toEqual(['R14:x', 'R16', 'R10']);
    expect(runInsights([rule('a', cands)], ctx()).map((i) => i.id)).toEqual(['R14:x', 'R16', 'R10']);
  });
});
