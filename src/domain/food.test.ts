import { buildPersona, ANCHOR } from '../state/personas';
import { logReaction, logSolids, qualifyingRecipes, reactionStatus, slotForTime, suggestMeal } from './food';
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
