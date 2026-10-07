import { differenceInHours } from 'date-fns';
import { FOODS } from '../content/foods';
import { RECIPES, type Recipe } from '../content/recipes';
import { parseDate, toISODate } from './dates';
import type { DomainState, FoodIntroduction, MealSlot, ReactionSeverity, ReactionStatus } from './types';
import { addLog, TransitionError } from './transitions';

/**
 * Solids, food journey, meal suggestion and reactions (9.9, B12 to B14).
 * Weave never interprets a reaction: it records what she saw and routes
 * emergencies to people (11.3).
 */

/** A first-food prompt stays 72 hours, then retires into the journal (9.9). */
export const FIRST_FOOD_WATCH_HOURS = 72;
/** Do not suggest the same recipe again within three days (9.9). */
export const RECIPE_REPEAT_DAYS = 3;

export function slotForTime(d: Date): MealSlot {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 10 * 60) return 'breakfast';
  if (m < 15 * 60) return 'lunch';
  if (m < 17 * 60 + 30) return 'snack';
  return 'dinner';
}

/**
 * The status to show and to decide safety with. "None yet" becomes "None"
 * once the 72-hour watch passes without a reaction logged.
 */
export function reactionStatus(intro: FoodIntroduction, now: Date): ReactionStatus {
  if (intro.reaction !== 'none_yet') return intro.reaction;
  return differenceInHours(now, parseDate(intro.firstOn)) >= FIRST_FOOD_WATCH_HOURS ? 'none' : 'none_yet';
}

/** Log a solids meal. Foods never logged before become FoodIntroductions with "None yet" (first-food detection). */
export function logSolids(
  state: DomainState,
  childId: string,
  input: { slot: MealSlot; foodIds: string[]; recipeId?: string; note?: string; customNames?: Record<string, string> },
  at: Date,
): { state: DomainState; newFoods: string[] } {
  if (!input.foodIds.length) throw new TransitionError('Add at least one food');
  const r = addLog(state, { kind: 'child', childId }, { type: 'feed', mode: 'solids', slot: input.slot, foodIds: input.foodIds, recipeId: input.recipeId }, at, 'sheet', { note: input.note });
  const known = new Set(state.foodIntros.filter((f) => f.childId === childId).map((f) => f.foodId));
  const newFoods = [...new Set(input.foodIds)].filter((id) => !known.has(id));
  const intros: FoodIntroduction[] = newFoods.map((foodId) => ({ foodId, childId, firstOn: toISODate(at), allergenGroup: FOODS[foodId]?.allergen, reaction: 'none_yet' }));
  return {
    state: { ...r.state, foodIntros: [...r.state.foodIntros, ...intros], customFoods: { ...(state.customFoods ?? {}), ...(input.customNames ?? {}) } },
    newFoods,
  };
}

/** Save a reaction (B14 step 4): log it and update the food's status. No diagnosis. */
export function logReaction(state: DomainState, childId: string, input: { foodId: string; symptoms: string[]; severity: ReactionSeverity; note?: string }, onset: Date) {
  if (!input.symptoms.length) throw new TransitionError('Choose at least one symptom');
  const r = addLog(state, { kind: 'child', childId }, { type: 'reaction', foodId: input.foodId, symptoms: input.symptoms, severity: input.severity }, onset, 'sheet', { note: input.note });
  const exists = r.state.foodIntros.some((f) => f.childId === childId && f.foodId === input.foodId);
  const foodIntros = exists
    ? r.state.foodIntros.map((f) => (f.childId === childId && f.foodId === input.foodId ? { ...f, reaction: input.severity } : f))
    : [...r.state.foodIntros, { foodId: input.foodId, childId, firstOn: toISODate(onset), allergenGroup: FOODS[input.foodId]?.allergen, reaction: input.severity }];
  return { state: { ...r.state, foodIntros }, entry: r.entry };
}

/** Foods introduced with no reaction above "None" (9.9). Foods still in their 72-hour watch do not count yet. */
export function safeFoods(state: DomainState, childId: string, now: Date): Set<string> {
  return new Set(state.foodIntros.filter((f) => f.childId === childId && reactionStatus(f, now) === 'none').map((f) => f.foodId));
}

export function qualifyingRecipes(state: DomainState, childId: string, now: Date, slot: MealSlot = slotForTime(now)): Recipe[] {
  const safe = safeFoods(state, childId, now);
  const recent = new Set(
    state.logs
      .filter((l) => l.type === 'feed' && l.mode === 'solids' && l.recipeId && l.subject.kind === 'child' && l.subject.childId === childId)
      .filter((l) => now.getTime() - parseDate(l.at).getTime() < RECIPE_REPEAT_DAYS * 864e5)
      .map((l) => (l.type === 'feed' && l.mode === 'solids' ? l.recipeId : undefined)),
  );
  return RECIPES.filter((r) => r.slots.includes(slot) && r.ingredients.every((i) => safe.has(i)) && !recent.has(r.id));
}

/** Today's suggestion: deterministic per day so it does not change on every render. */
export function suggestMeal(state: DomainState, childId: string, now: Date): { slot: MealSlot; recipe?: Recipe } {
  const slot = slotForTime(now);
  const options = qualifyingRecipes(state, childId, now, slot);
  if (!options.length) return { slot };
  const dayIndex = Math.floor(new Date(toISODate(now)).getTime() / 864e5);
  // Prefer the recipe with the most introduced ingredients (more variety), rotate by day among equals.
  const top = Math.max(...options.map((r) => r.ingredients.length));
  const best = options.filter((r) => r.ingredients.length === top);
  return { slot, recipe: best[dayIndex % best.length] };
}

/** Emergency symptoms (9.9 step 3). Selecting any of these shows the emergency card before anything is saved. */
export const EMERGENCY_SYMPTOMS = ['Swelling of the face, lips or tongue', 'Difficulty breathing', 'Repeated vomiting with unusual sleepiness'];
export const REACTION_SYMPTOMS = ['Rash or hives', 'Vomiting', 'Diarrhoea', 'Swelling', 'Cough or wheeze', 'Unusual fussiness', 'Other'];
