import { checkInvariants } from '../domain/transitions';
import { deriveTodayState, postpartumLabel, currentPeriodDay, deriveStage, usesFormula } from '../domain/stage';
import { childAge, formatChildAge, formulaDaysLeft, pregnancyWeek } from '../domain/dates';
import { ANCHOR, buildPersona, PERSONAS } from './personas';

describe('seed personas (3.3) on one timeline', () => {
  it.each(PERSONAS.map((p) => p.id))('%s satisfies the domain invariants', (id) => {
    expect(checkInvariants(buildPersona(id))).toEqual([]);
  });

  it('D1: week 22, due 31 December, two prenatal medicines, appointment upcoming', () => {
    const s = buildPersona('D1');
    expect(s.her.pregnancy!.dueDate).toBe('2026-12-31');
    expect(pregnancyWeek(s.her.pregnancy!.dueDate, ANCHOR).week).toBe(22);
    expect(s.medicines.filter((m) => !m.archived)).toHaveLength(2);
    expect(deriveTodayState(s, ANCHOR)).toBe('pregnancy');
    expect(new Date(s.appointments[0]!.at!).getDay()).toBe(1); // a Monday
  });

  it('D2: week 40 day 2, Labour mode available', () => {
    const s = buildPersona('D2');
    expect(pregnancyWeek(s.her.pregnancy!.dueDate, ANCHOR)).toMatchObject({ week: 40, day: 2 });
    expect(deriveTodayState(s, ANCHOR)).toBe('pregnancy_late');
    expect(s.logs.filter((l) => l.type === 'practice_contraction').length).toBeGreaterThan(10);
  });

  it('D3: postpartum week 3, newborn, one active tin opened ten days ago', () => {
    const s = buildPersona('D3');
    expect(postpartumLabel(s, ANCHOR)).toBe(3);
    expect(deriveStage(s.children[0]!, ANCHOR)).toBe('newborn');
    expect(deriveTodayState(s, ANCHOR)).toBe('postpartum_baby');
    expect(formulaDaysLeft(s.formulaPacks[0]!.discardBy, ANCHOR)).toBe(35);
    expect(usesFormula(s, s.children[0]!.id)).toBe(true);
    expect(s.her.cycle.active).toBe(false);
  });

  it('D4: postpartum week 7 with cycle tracking active (combined state)', () => {
    const s = buildPersona('D4');
    expect(postpartumLabel(s, ANCHOR)).toBe(7);
    expect(s.her.phase).toBe('postpartum');
    expect(currentPeriodDay(s, ANCHOR)).toBe(3);
    expect(usesFormula(s, s.children[0]!.id)).toBe(false);
  });

  it('D5: toddler 14 months, period day 3, curd new today, tin five days from discard', () => {
    const s = buildPersona('D5');
    expect(formatChildAge(s.children[0]!.dob, ANCHOR)).toBe('1y 2m 20d');
    expect(deriveTodayState(s, ANCHOR)).toBe('toddler');
    expect(currentPeriodDay(s, ANCHOR)).toBe(3);
    expect(formulaDaysLeft(s.formulaPacks[0]!.discardBy, ANCHOR)).toBe(5);
    expect(s.foodIntros.find((f) => f.reaction === 'none_yet')?.foodId).toBe('curd');
    expect(s.medicines.filter((m) => m.course)).toHaveLength(1);
    expect(postpartumLabel(s, ANCHOR)).toBeUndefined(); // past 12 months
  });

  it('D6: pregnant again at week 16 with the toddler; cycle paused', () => {
    const s = buildPersona('D6');
    expect(pregnancyWeek(s.her.pregnancy!.dueDate, ANCHOR).week).toBe(16);
    expect(deriveTodayState(s, ANCHOR)).toBe('pregnancy_with_child');
    expect(s.her.cycle.active).toBe(false);
  });
});

describe('seeds follow the demo clock (D1 to D6)', () => {
  const TIMES = [
    new Date(2026, 7, 27, 3, 0), // small hours on the anchor day
    new Date(2026, 7, 27, 22, 45),
    new Date(2026, 7, 29, 10, 30), // two days on: the "47h since last meal" case
    new Date(2026, 9, 7, 15, 5),
    new Date(2027, 0, 1, 0, 20), // across a year boundary
  ];
  const cases = PERSONAS.flatMap((p) => TIMES.map((t) => [p.id, t] as const));

  it.each(cases)('%s at %s: valid, nothing in the future, same gaps as at the anchor', (id, at) => {
    const s = buildPersona(id, at);
    expect(checkInvariants(s)).toEqual([]);
    expect(s.logs.filter((l) => new Date(l.at) > at)).toEqual([]);
    // Everything moves together: the newest log is as recent as it is at the anchor.
    const newest = (st: typeof s, now: Date) => now.getTime() - Math.max(...st.logs.map((l) => new Date(l.at).getTime()));
    expect(newest(s, at)).toBe(newest(buildPersona(id), ANCHOR));
  });

  it.each(TIMES)('D5 at %s: last meal 15 minutes ago, same age, period day 3, tin five days out', (at) => {
    const s = buildPersona('D5', at);
    const feeds = s.logs.filter((l) => l.type === 'feed').map((l) => new Date(l.at).getTime());
    expect((at.getTime() - Math.max(...feeds)) / 60_000).toBe(15);
    // Same age in days; the "1y 2m 20d" reading can move a day with month lengths.
    expect(childAge(s.children[0]!.dob, at).totalDays).toBe(childAge(buildPersona('D5').children[0]!.dob, ANCHOR).totalDays);
    expect(currentPeriodDay(s, at)).toBe(3);
    expect(formulaDaysLeft(s.formulaPacks[0]!.discardBy, at)).toBe(5);
  });

  it.each(TIMES)('D1 at %s: still week 22, still eighteen weeks to go', (at) => {
    const s = buildPersona('D1', at);
    expect(pregnancyWeek(s.her.pregnancy!.dueDate, at).week).toBe(22);
  });
});
