import { ANCHOR, buildPersona } from '../state/personas';
import { CARE_ITEMS } from '../content/selfcare';
import { careFor, careStage, planDaysDone, togglePlanDay } from './library';
import { suggestionsFor } from './suggestions';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('self-care library (decision 2026-10-30)', () => {
  it('reads her stage: period days first, then pregnancy, postpartum, or cycle', () => {
    expect(careStage(buildPersona('D5'), ANCHOR)).toBe('period');
    expect(careStage(buildPersona('D1'), ANCHOR)).toBe('pregnancy');
    expect(careStage(buildPersona('D3'), ANCHOR)).toBe('postpartum');
    expect(careStage(buildPersona('D7'), ANCHOR)).toBe('cycle');
  });

  it('shows only what suits her stage, with something in every row', () => {
    for (const id of ['D1', 'D3', 'D5', 'D7'] as const) {
      const { plans, videos, foods } = careFor(buildPersona(id), ANCHOR);
      expect(plans.length * videos.length * foods.length, id).toBeGreaterThan(0);
    }
    const pregnant = careFor(buildPersona('D1'), ANCHOR);
    expect(ids(pregnant.videos)).toContain('pregnancy-hips');
    expect(ids(pregnant.videos)).not.toContain('yoga-cramps');
    expect(ids(careFor(buildPersona('D7'), ANCHOR).plans)).not.toContain('pregnancy-stretch');
  });

  it('a walking plan waits until six weeks after birth', () => {
    expect(ids(careFor(buildPersona('D3'), ANCHOR).plans)).toEqual(['pelvic-floor']); // week 3
    expect(ids(careFor(buildPersona('D3'), new Date(2026, 8, 30)).plans)).toContain('walk-further'); // week 8
  });

  it('plan days are marked done and undone', () => {
    let s = togglePlanDay(buildPersona('D3'), 'pelvic-floor', 2);
    s = togglePlanDay(s, 'pelvic-floor', 0);
    expect(planDaysDone(s, 'pelvic-floor')).toEqual([0, 2]);
    expect(planDaysDone(togglePlanDay(s, 'pelvic-floor', 2), 'pelvic-floor')).toEqual([0]);
  });

  it('every suggestion that links into the library links to an item that exists', () => {
    for (const id of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] as const) {
      for (const sg of suggestionsFor(buildPersona(id), ANCHOR)) {
        if (sg.action?.kind !== 'route' || !sg.action.to.startsWith('/me/care/')) continue;
        const [, , , kind, itemId] = sg.action.to.split('/');
        if (kind === 'breathe') continue;
        expect(CARE_ITEMS.some((x) => x.kind === kind && x.id === itemId), sg.action.to).toBe(true);
      }
    }
  });
});
