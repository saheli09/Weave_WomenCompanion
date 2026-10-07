import { buildPersona, ANCHOR } from '../state/personas';
import { logReaction, logSolids, nextMeal, planDay, qualifyingRecipes, reactionStatus, slotForTime, suggestMeal } from './food';
import { checkInvariants } from './transitions';

const C = 'child_srinika';

describe('meal suggestion (B13)', () => {
  it('D5 at 10:30 suggests lunch from foods introduced safely, as in the S02 frame', () => {
    const s = buildPersona('D5');
    expect(slotForTime(ANCHOR)).toBe('lunch');
    const { recipe } = suggestMeal(s, C, ANCHOR);
    expect(recipe?.name).toBe('Rice + chicken stew');
    for (const r of qualifyingRecipes(s, C, ANCHOR)) expect(r.ingredients).not.toContain('curd'); // still in its 72-hour watch
  });
  it('a food with any reaction above None blocks its recipes', () => {
    const s = logReaction(buildPersona('D5'), C, { foodId: 'chicken', symptoms: ['Rash or hives'], severity: 'mild' }, ANCHOR).state;
    expect(qualifyingRecipes(s, C, ANCHOR).some((r) => r.ingredients.includes('chicken'))).toBe(false);
  });
  it('a recipe fed in the last three days is not suggested again', () => {
    const s = logSolids(buildPersona('D5'), C, { slot: 'lunch', foodIds: ['rice', 'chicken', 'carrot', 'potato', 'onion', 'tomato'], recipeId: 'chicken-stew' }, new Date(ANCHOR.getTime() - 864e5)).state;
    expect(suggestMeal(s, C, ANCHOR).recipe?.id).not.toBe('chicken-stew');
  });
  it('nothing qualifies with no safe foods', () => {
    const s = { ...buildPersona('D5'), foodIntros: [] };
    expect(suggestMeal(s, C, ANCHOR).recipe).toBeUndefined();
  });
});

describe('the day of meals (B13, design addition)', () => {
  it('D5 at 10:30: breakfast and snack show what was logged; lunch leads; dinner gets its own suggestion', () => {
    const plan = planDay(buildPersona('D5'), C, ANCHOR);
    expect(plan.map((p) => p.slot)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    expect(plan[0]!.fed?.foodIds).toEqual(['ragi', 'banana']);
    expect(plan[2]!.fed?.foodIds).toEqual(['curd']);
    expect(plan[1]!.recipe?.name).toBe('Rice + chicken stew');
    expect(plan[3]!.recipe).toBeDefined();
    expect(nextMeal(plan, ANCHOR)?.slot).toBe('lunch');
  });
  it('never suggests the same recipe twice in a day', () => {
    const s = { ...buildPersona('D5'), logs: buildPersona('D5').logs.filter((l) => !(l.type === 'feed' && l.at.startsWith('2026-08-27'))) };
    const ids = planDay(s, C, ANCHOR).map((p) => p.recipe?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('once lunch is logged, the card leads with the next meal', () => {
    const s = logSolids(buildPersona('D5'), C, { slot: 'lunch', foodIds: ['rice', 'chicken', 'carrot', 'potato', 'onion', 'tomato'], recipeId: 'chicken-stew' }, ANCHOR).state;
    const plan = planDay(s, C, ANCHOR);
    expect(plan[1]!.fed?.recipeId).toBe('chicken-stew');
    expect(plan[1]!.recipe?.name).toBe('Rice + chicken stew');
    expect(nextMeal(plan, ANCHOR)?.slot).toBe('dinner');
    expect(suggestMeal(s, C, ANCHOR).recipe).toBeUndefined();
  });
  it('after dinner is logged there is no lead meal, only the day', () => {
    const late = new Date(2026, 7, 27, 20, 0);
    const s = logSolids(buildPersona('D5'), C, { slot: 'dinner', foodIds: ['rice', 'dal'] }, late).state;
    expect(nextMeal(planDay(s, C, late), late)).toBeUndefined();
  });
});

describe('first-food detection and reactions (B12, B14)', () => {
  it('a never-logged food becomes "None yet", then "None" after 72 hours', () => {
    const r = logSolids(buildPersona('D5'), C, { slot: 'snack', foodIds: ['papaya', 'banana'] }, ANCHOR);
    expect(r.newFoods).toEqual(['papaya']);
    const intro = r.state.foodIntros.find((f) => f.foodId === 'papaya')!;
    expect(reactionStatus(intro, ANCHOR)).toBe('none_yet');
    expect(reactionStatus(intro, new Date(ANCHOR.getTime() + 73 * 3600_000))).toBe('none');
    expect(checkInvariants(r.state)).toEqual([]);
  });
  it('allergen group is recorded; custom foods keep their name', () => {
    const r = logSolids(buildPersona('D5'), C, { slot: 'snack', foodIds: ['peanut', 'sabudana'], customNames: { sabudana: 'sabudana' } }, ANCHOR);
    expect(r.state.foodIntros.find((f) => f.foodId === 'peanut')!.allergenGroup).toBe('peanut');
    expect(r.state.customFoods!.sabudana).toBe('sabudana');
  });
  it('a reaction updates the food status and logs the symptoms', () => {
    const r = logReaction(buildPersona('D5'), C, { foodId: 'curd', symptoms: ['Rash or hives'], severity: 'moderate' }, ANCHOR);
    expect(r.state.foodIntros.find((f) => f.foodId === 'curd')!.reaction).toBe('moderate');
    expect(r.entry).toMatchObject({ type: 'reaction', foodId: 'curd', severity: 'moderate' });
  });
});
