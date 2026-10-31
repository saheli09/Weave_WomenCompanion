import type { Review } from './copy';
import type { MealSlot } from '../domain/types';

/**
 * Seed recipe library for meal suggestions (B13, 9.9): Indian home cooking,
 * each recipe tagged with ingredient ids. A recipe is suggested only if every
 * ingredient has been introduced with no reaction (domain/food.ts).
 * Quantities are for one toddler portion; times assume a pressure cooker for
 * rice and dal. Water is listed apart because it is not a food to introduce.
 * Age-appropriateness, portions and food-safety notes NEED CLINICAL REVIEW.
 */
export interface Recipe {
  id: string;
  name: string;
  slots: MealSlot[];
  ingredients: string[];
  /** Quantity per ingredient id, for one toddler portion. */
  amounts: Record<string, string>;
  water?: string;
  prepMin: number;
  /** 0 when nothing is cooked. */
  cookMin: number;
  steps: string[];
}

export const RECIPE_REVIEW: Review = { kind: 'clinical', ref: '9.9', note: 'Recipe library: textures, salt, portions and age suitability' };

const main: MealSlot[] = ['lunch', 'dinner'];

/** Ingredient ids come from the keys of `items`, in order, so ids and quantities can't drift apart. */
function recipe(r: Omit<Recipe, 'ingredients' | 'amounts'> & { items: Record<string, string> }): Recipe {
  const { items, ...rest } = r;
  return { ...rest, ingredients: Object.keys(items), amounts: items };
}

export const RECIPES: Recipe[] = [
  recipe({ id: 'khichdi', name: 'Moong dal khichdi', slots: main, items: { rice: '2 tbsp', dal: '1 tbsp', ghee: '¼ tsp' }, water: '1 cup', prepMin: 5, cookMin: 20, steps: ['Rinse the rice and dal together.', 'Pressure cook with plenty of water until very soft.', 'Mash well and stir in a little ghee.'] }),
  recipe({ id: 'veg-khichdi', name: 'Vegetable khichdi', slots: main, items: { rice: '2 tbsp', dal: '1 tbsp', carrot: '2 tbsp, grated', peas: '1 tbsp' }, water: '1¼ cups', prepMin: 10, cookMin: 20, steps: ['Cook rice, dal, carrot and peas together until soft.', 'Mash to a texture your child manages.'] }),
  recipe({ id: 'dal-rice', name: 'Dal and rice', slots: main, items: { rice: '2 tbsp', dal: '2 tbsp' }, water: '1 cup', prepMin: 5, cookMin: 20, steps: ['Cook the dal until it falls apart.', 'Mix with soft rice and mash.'] }),
  recipe({ id: 'masoor-rice', name: 'Masoor dal with rice', slots: main, items: { rice: '2 tbsp', masoor: '2 tbsp', tomato: '¼ small, chopped' }, water: '1 cup', prepMin: 5, cookMin: 20, steps: ['Cook masoor dal with a little tomato until soft.', 'Serve over soft rice.'] }),
  recipe({ id: 'chicken-stew', name: 'Rice + chicken stew', slots: main, items: { rice: '2 tbsp', chicken: '40 g, boneless', carrot: '¼ small, diced', potato: '¼ small, diced', onion: '1 tbsp, chopped', tomato: '¼ small, chopped' }, water: '1 cup', prepMin: 10, cookMin: 35, steps: ['Simmer chicken with onion, tomato, carrot and potato until very tender.', 'Shred the chicken finely.', 'Serve with soft rice.'] }),
  recipe({ id: 'veg-stew', name: 'Vegetable stew', slots: main, items: { carrot: '¼ small, diced', potato: '¼ small, diced', beans: '3 to 4, chopped', onion: '1 tbsp, chopped' }, water: '¾ cup', prepMin: 10, cookMin: 20, steps: ['Simmer the vegetables in water until soft.', 'Mash lightly, leaving soft pieces if your child manages them.'] }),
  recipe({ id: 'pumpkin-dal', name: 'Pumpkin dal', slots: main, items: { dal: '2 tbsp', pumpkin: '¼ cup, cubed' }, water: '¾ cup', prepMin: 5, cookMin: 20, steps: ['Cook dal with pumpkin cubes until both are soft.', 'Mash together.'] }),
  recipe({ id: 'lauki-rice', name: 'Bottle gourd and rice', slots: main, items: { rice: '2 tbsp', bottlegourd: '¼ cup, grated', ghee: '¼ tsp' }, water: '1 cup', prepMin: 10, cookMin: 20, steps: ['Cook rice with grated bottle gourd until soft.', 'Finish with a little ghee.'] }),
  recipe({ id: 'palak-dal', name: 'Spinach dal', slots: main, items: { dal: '2 tbsp', spinach: '6 to 8 leaves, chopped', rice: '2 tbsp' }, water: '1 cup', prepMin: 10, cookMin: 20, steps: ['Cook dal with chopped spinach.', 'Blend smooth or mash, and serve with rice.'] }),
  recipe({ id: 'fish-rice', name: 'Fish and rice', slots: main, items: { fish: '40 g, boneless fillet', rice: '2 tbsp', tomato: '¼ small, chopped' }, water: '¾ cup', prepMin: 10, cookMin: 20, steps: ['Steam a boneless piece of fish.', 'Check carefully for bones, then flake.', 'Mix into soft rice with a little cooked tomato.'] }),
  recipe({ id: 'egg-rice', name: 'Egg fried rice, soft', slots: main, items: { egg: '1', rice: '¼ cup, cooked', carrot: '1 tbsp, diced', peas: '1 tbsp' }, prepMin: 5, cookMin: 10, steps: ['Scramble the egg until fully cooked.', 'Toss with soft rice and steamed carrot and peas.'] }),
  recipe({ id: 'paneer-bhurji', name: 'Soft paneer bhurji', slots: ['breakfast', 'dinner'], items: { paneer: '30 g', tomato: '¼ small, chopped', onion: '1 tbsp, chopped' }, prepMin: 5, cookMin: 10, steps: ['Cook onion and tomato until soft.', 'Crumble in paneer and warm through.'] }),
  recipe({ id: 'curd-rice', name: 'Curd rice', slots: ['lunch', 'snack'], items: { rice: '¼ cup, cooked', curd: '3 tbsp' }, prepMin: 5, cookMin: 0, steps: ['Mash soft rice.', 'Mix in curd at room temperature.'] }),
  recipe({ id: 'ragi-porridge', name: 'Ragi porridge', slots: ['breakfast', 'snack'], items: { ragi: '1 tbsp flour', jaggery: 'A pinch, optional' }, water: '½ cup', prepMin: 2, cookMin: 8, steps: ['Whisk ragi flour into water to avoid lumps.', 'Cook while stirring until thick.', 'A very small amount of jaggery is optional.'] }),
  recipe({ id: 'ragi-banana', name: 'Ragi and banana porridge', slots: ['breakfast'], items: { ragi: '1 tbsp flour', banana: '½ small, ripe' }, water: '½ cup', prepMin: 5, cookMin: 8, steps: ['Cook ragi flour in water until thick.', 'Stir in mashed ripe banana.'] }),
  recipe({ id: 'oats-apple', name: 'Oats with stewed apple', slots: ['breakfast'], items: { oats: '2 tbsp', apple: '¼, peeled and chopped' }, water: '½ cup', prepMin: 5, cookMin: 10, steps: ['Cook oats in water until soft.', 'Stir in stewed, mashed apple.'] }),
  recipe({ id: 'suji-upma', name: 'Suji upma, soft', slots: ['breakfast', 'snack'], items: { suji: '2 tbsp', carrot: '1 tbsp, grated', peas: '1 tbsp', ghee: '½ tsp' }, water: '½ cup', prepMin: 5, cookMin: 10, steps: ['Roast suji in a little ghee.', 'Add water and finely grated vegetables.', 'Cook until soft.'] }),
  recipe({ id: 'veg-poha', name: 'Vegetable poha', slots: ['breakfast', 'snack'], items: { poha: '3 tbsp', potato: '¼ small, boiled and diced', peas: '1 tbsp', onion: '1 tsp, finely chopped' }, prepMin: 10, cookMin: 10, steps: ['Rinse poha until soft.', 'Cook with soft potato, peas and onion.'] }),
  recipe({ id: 'idli', name: 'Soft idli', slots: ['breakfast', 'snack'], items: { idli: 'Batter for 2 small idlis', rice: 'Part of the batter' }, prepMin: 5, cookMin: 12, steps: ['Steam idlis.', 'Break into small soft pieces or mash with a little water.'] }),
  recipe({ id: 'idli-dal', name: 'Idli with moong dal', slots: ['breakfast'], items: { idli: 'Batter for 2 small idlis', rice: 'Part of the batter', dal: '1 tbsp' }, water: '½ cup', prepMin: 5, cookMin: 20, steps: ['Steam idlis.', 'Serve with thin cooked moong dal for dipping.'] }),
  recipe({ id: 'egg-scramble', name: 'Soft scrambled egg', slots: ['breakfast'], items: { egg: '1', ghee: '½ tsp' }, prepMin: 2, cookMin: 5, steps: ['Cook the egg in a little ghee until fully set.', 'Break into small pieces.'] }),
  recipe({ id: 'egg-tomato', name: 'Egg and tomato scramble', slots: ['breakfast'], items: { egg: '1', tomato: '¼ small, chopped', onion: '1 tsp, finely chopped' }, prepMin: 5, cookMin: 8, steps: ['Cook onion and tomato until soft.', 'Add egg and cook until fully set.'] }),
  recipe({ id: 'banana-mash', name: 'Mashed banana', slots: ['snack', 'breakfast'], items: { banana: '½ small, ripe' }, prepMin: 2, cookMin: 0, steps: ['Mash a ripe banana with a fork.'] }),
  recipe({ id: 'papaya-mash', name: 'Mashed papaya', slots: ['snack'], items: { papaya: '¼ cup, ripe and cubed' }, prepMin: 3, cookMin: 0, steps: ['Mash ripe papaya until smooth.'] }),
  recipe({ id: 'pear-puree', name: 'Stewed pear', slots: ['snack'], items: { pear: '½ medium, peeled' }, prepMin: 5, cookMin: 10, steps: ['Steam peeled pear until soft.', 'Mash.'] }),
  recipe({ id: 'apple-stew', name: 'Stewed apple', slots: ['snack'], items: { apple: '½ medium, peeled' }, prepMin: 5, cookMin: 10, steps: ['Steam peeled apple until soft.', 'Mash.'] }),
  recipe({ id: 'mango-curd', name: 'Mango and curd', slots: ['snack'], items: { mango: '2 tbsp, mashed', curd: '3 tbsp' }, prepMin: 3, cookMin: 0, steps: ['Mash ripe mango.', 'Stir into curd.'] }),
  recipe({ id: 'sweet-potato', name: 'Mashed sweet potato', slots: ['snack', 'lunch'], items: { sweetpotato: '½ small', ghee: '¼ tsp' }, prepMin: 5, cookMin: 15, steps: ['Steam sweet potato until soft.', 'Mash with a little ghee.'] }),
  recipe({ id: 'beet-rice', name: 'Beetroot rice', slots: main, items: { rice: '2 tbsp', beetroot: '2 tbsp, grated', ghee: '¼ tsp' }, water: '1 cup', prepMin: 10, cookMin: 20, steps: ['Cook rice with grated beetroot until soft.', 'Finish with a little ghee.'] }),
  recipe({ id: 'chikoo-mash', name: 'Mashed chikoo', slots: ['snack'], items: { chikoo: '1 small, ripe' }, prepMin: 3, cookMin: 0, steps: ['Scoop and mash ripe chikoo.'] }),
  recipe({ id: 'avocado-mash', name: 'Mashed avocado', slots: ['snack'], items: { avocado: '¼, ripe' }, prepMin: 2, cookMin: 0, steps: ['Mash ripe avocado until smooth.'] }),
  recipe({ id: 'chapati-dal', name: 'Soft chapati in dal', slots: main, items: { wheat: '1 small soft chapati', dal: '3 tbsp, cooked thin', ghee: '¼ tsp' }, prepMin: 5, cookMin: 5, steps: ['Tear a soft chapati into small pieces.', 'Soak in thin warm dal until soft.'] }),
  recipe({ id: 'tofu-veg', name: 'Tofu and vegetable mash', slots: main, items: { tofu: '30 g, soft', carrot: '2 tbsp, diced', peas: '1 tbsp' }, prepMin: 5, cookMin: 10, steps: ['Steam the vegetables until soft.', 'Mash with soft tofu.'] }),
  recipe({ id: 'peanut-porridge', name: 'Oats with peanut powder', slots: ['breakfast'], items: { oats: '2 tbsp', peanut: '½ tsp, smooth powder', banana: '¼ small, ripe' }, water: '½ cup', prepMin: 5, cookMin: 10, steps: ['Cook oats in water until soft.', 'Stir in a little smooth peanut powder and mashed banana.'] }),
  recipe({ id: 'chicken-soup', name: 'Chicken and vegetable soup', slots: ['dinner'], items: { chicken: '40 g, boneless', carrot: '¼ small, diced', beans: '3 to 4, chopped', onion: '1 tbsp, chopped' }, water: '1½ cups', prepMin: 10, cookMin: 35, steps: ['Simmer chicken and vegetables until very soft.', 'Shred finely or blend.'] }),
];

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);

/**
 * Dish photos (AI-generated, one per recipe) live in src/assets/recipes/<id>.jpg.
 * A recipe without a file simply has no photo; dropping in <id>.jpg adds it.
 */
const PHOTOS = import.meta.glob<string>('../assets/recipes/*.jpg', { eager: true, query: '?url', import: 'default' });

export const recipePhoto = (id: string): string | undefined => PHOTOS[`../assets/recipes/${id}.jpg`];
