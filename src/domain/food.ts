import { differenceInHours } from 'date-fns';
import { FOODS } from '../content/foods';
import { RECIPES, recipeById, type Recipe } from '../content/recipes';
import { parseDate, toISODate } from './dates';
import type { DomainState, FoodIntroduction, LogEntry, MealSlot, ReactionSeverity, ReactionStatus } from './types';
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

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export interface MealPlanSlot {
  slot: MealSlot;
  /** The suggestion, or the recipe she logged for this slot. */
  recipe?: Recipe;
  /** Today's solids log for this slot, if there is one. */
  fed?: Extract<LogEntry, { type: 'feed'; mode: 'solids' }>;
}

/**
 * Today's four meals (design addition on B13). Logged slots show what was fed;
 * the rest get a suggestion, never the same recipe twice in a day. Deterministic
 * per day so it does not change on every render.
 */
export function planDay(state: DomainState, childId: string, now: Date): MealPlanSlot[] {
  const today = toISODate(now);
  const solids = state.logs.filter(
    (l): l is NonNullable<MealPlanSlot['fed']> => l.type === 'feed' && l.mode === 'solids' && l.subject.kind === 'child' && l.subject.childId === childId && toISODate(parseDate(l.at)) === today,
  );
  const used = new Set(solids.map((l) => l.recipeId).filter(Boolean));
  const dayIndex = Math.floor(new Date(today).getTime() / 864e5);
  return MEAL_SLOTS.map((slot) => {
    const fed = solids.filter((l) => l.slot === slot).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    if (fed) return { slot, fed, recipe: fed.recipeId ? recipeById(fed.recipeId) : undefined };
    const options = qualifyingRecipes(state, childId, now, slot).filter((r) => !used.has(r.id));
    if (!options.length) return { slot };
    // Prefer the recipe with the most introduced ingredients (more variety), rotate by day among equals.
    const top = Math.max(...options.map((r) => r.ingredients.length));
    const best = options.filter((r) => r.ingredients.length === top);
    const recipe = best[dayIndex % best.length]!;
    used.add(recipe.id);
    return { slot, recipe };
  });
}

/** The meal the card leads with: the first slot from now on that has not been logged. */
export function nextMeal(plan: MealPlanSlot[], now: Date): MealPlanSlot | undefined {
  const from = MEAL_SLOTS.indexOf(slotForTime(now));
  return plan.find((p) => MEAL_SLOTS.indexOf(p.slot) >= from && !p.fed);
}

/** The suggestion for the current time slot. */
export function suggestMeal(state: DomainState, childId: string, now: Date): { slot: MealSlot; recipe?: Recipe } {
  const slot = slotForTime(now);
  const p = planDay(state, childId, now).find((x) => x.slot === slot)!;
  return { slot, recipe: p.fed ? undefined : p.recipe };
}

/** Emergency symptoms (9.9 step 3). Selecting any of these shows the emergency card before anything is saved. */
export const EMERGENCY_SYMPTOMS = ['Swelling of the face, lips or tongue', 'Difficulty breathing', 'Repeated vomiting with unusual sleepiness'];
export const REACTION_SYMPTOMS = ['Rash or hives', 'Vomiting', 'Diarrhoea', 'Swelling', 'Cough or wheeze', 'Unusual fussiness', 'Other'];
