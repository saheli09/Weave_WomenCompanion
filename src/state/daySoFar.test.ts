import { ANCHOR, buildPersona } from './personas';
import { daySoFar, timelineItems } from './selectors';

describe('Today so far at a glance (decision 2026-11-01)', () => {
  it('a newborn day: totals per person, the child first, the same logs as the list', () => {
    const s = buildPersona('D3');
    const { groups, count } = daySoFar(s, ANCHOR);
    expect(count).toBe(timelineItems(s, ANCHOR).length);
    expect(groups[0]!.subject.kind).toBe('child');
    expect(groups.at(-1)!.subject).toEqual({ kind: 'her', label: 'Me' });
    const child = Object.fromEntries(groups[0]!.totals.map((t) => [t.key, t]));
    expect(child.feed!.label).toMatch(/^Feeds?$/);
    expect(child.diaper).toBeDefined();
    expect(child.sleep!.value).toMatch(/^\d+h \d+m$/);
    expect(child.sleep!.when).toMatch(/^Woke \d+:\d\d[ap]m$/);
    expect(child.diaper!.when).toMatch(/^Last \d+:\d\d[ap]m$/);
  });

  it('a cycle tracker: only her, with sleep, water and mood', () => {
    const { groups } = daySoFar(buildPersona('D7'), ANCHOR);
    expect(groups.map((g) => g.subject.label)).toEqual(['Me']);
    const keys = groups[0]!.totals.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['sleep', 'water', 'mood']));
    expect(groups[0]!.totals.find((t) => t.key === 'water')).toMatchObject({ value: '2', label: 'Water' });
  });

  it('a toddler: meals counted apart from milk feeds', () => {
    const { groups } = daySoFar(buildPersona('D6'), ANCHOR);
    const child = groups.find((g) => g.subject.kind === 'child')!;
    const keys = child.totals.map((t) => t.key);
    expect(keys).toContain('meal');
    expect(keys.indexOf('feed')).toBeLessThan(keys.indexOf('diaper'));
  });

  it('when: the latest of each kind', () => {
    const { groups } = daySoFar(buildPersona('D7'), ANCHOR);
    const water = groups[0]!.totals.find((t) => t.key === 'water')!;
    expect(water.when).toBe('Last 9:45am'); // glasses at 8:00 and 9:45
  });
});
