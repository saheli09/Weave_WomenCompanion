import type { Review } from './copy';
import type { MealSlot } from '../domain/types';

/**
 * Seed recipe library for meal suggestions (B13, 9.9): Indian home cooking,
 * each recipe tagged with ingredient ids. A recipe is suggested only if every
 * ingredient has been introduced with no reaction (domain/food.ts).
 * Age-appropriateness and food-safety notes NEED CLINICAL REVIEW.
 */
export interface Recipe {
  id: string;
  name: string;
  slots: MealSlot[];
  ingredients: string[];
  steps: string[];
}

export const RECIPE_REVIEW: Review = { kind: 'clinical', ref: '9.9', note: 'Recipe library: textures, salt and age suitability' };

const main: MealSlot[] = ['lunch', 'dinner'];

export const RECIPES: Recipe[] = [
  { id: 'khichdi', name: 'Moong dal khichdi', slots: main, ingredients: ['rice', 'dal', 'ghee'], steps: ['Rinse the rice and dal together.', 'Pressure cook with plenty of water until very soft.', 'Mash well and stir in a little ghee.'] },
  { id: 'veg-khichdi', name: 'Vegetable khichdi', slots: main, ingredients: ['rice', 'dal', 'carrot', 'peas'], steps: ['Cook rice, dal, carrot and peas together until soft.', 'Mash to a texture your child manages.'] },
  { id: 'dal-rice', name: 'Dal and rice', slots: main, ingredients: ['rice', 'dal'], steps: ['Cook the dal until it falls apart.', 'Mix with soft rice and mash.'] },
  { id: 'masoor-rice', name: 'Masoor dal with rice', slots: main, ingredients: ['rice', 'masoor', 'tomato'], steps: ['Cook masoor dal with a little tomato until soft.', 'Serve over soft rice.'] },
  { id: 'chicken-stew', name: 'Rice + chicken stew', slots: main, ingredients: ['rice', 'chicken', 'carrot', 'potato', 'onion', 'tomato'], steps: ['Simmer chicken with onion, tomato, carrot and potato until very tender.', 'Shred the chicken finely.', 'Serve with soft rice.'] },
  { id: 'veg-stew', name: 'Vegetable stew', slots: main, ingredients: ['carrot', 'potato', 'beans', 'onion'], steps: ['Simmer the vegetables in water until soft.', 'Mash lightly, leaving soft pieces if your child manages them.'] },
  { id: 'pumpkin-dal', name: 'Pumpkin dal', slots: main, ingredients: ['dal', 'pumpkin'], steps: ['Cook dal with pumpkin cubes until both are soft.', 'Mash together.'] },
  { id: 'lauki-rice', name: 'Bottle gourd and rice', slots: main, ingredients: ['rice', 'bottlegourd', 'ghee'], steps: ['Cook rice with grated bottle gourd until soft.', 'Finish with a little ghee.'] },
  { id: 'palak-dal', name: 'Spinach dal', slots: main, ingredients: ['dal', 'spinach', 'rice'], steps: ['Cook dal with chopped spinach.', 'Blend smooth or mash, and serve with rice.'] },
  { id: 'fish-rice', name: 'Fish and rice', slots: main, ingredients: ['fish', 'rice', 'tomato'], steps: ['Steam a boneless piece of fish.', 'Check carefully for bones, then flake.', 'Mix into soft rice with a little cooked tomato.'] },
  { id: 'egg-rice', name: 'Egg fried rice, soft', slots: main, ingredients: ['egg', 'rice', 'carrot', 'peas'], steps: ['Scramble the egg until fully cooked.', 'Toss with soft rice and steamed carrot and peas.'] },
  { id: 'paneer-bhurji', name: 'Soft paneer bhurji', slots: ['breakfast', 'dinner'], ingredients: ['paneer', 'tomato', 'onion'], steps: ['Cook onion and tomato until soft.', 'Crumble in paneer and warm through.'] },
  { id: 'curd-rice', name: 'Curd rice', slots: ['lunch', 'snack'], ingredients: ['rice', 'curd'], steps: ['Mash soft rice.', 'Mix in curd at room temperature.'] },
  { id: 'ragi-porridge', name: 'Ragi porridge', slots: ['breakfast', 'snack'], ingredients: ['ragi', 'jaggery'], steps: ['Whisk ragi flour into water to avoid lumps.', 'Cook while stirring until thick.', 'A very small amount of jaggery is optional.'] },
  { id: 'ragi-banana', name: 'Ragi and banana porridge', slots: ['breakfast'], ingredients: ['ragi', 'banana'], steps: ['Cook ragi flour in water until thick.', 'Stir in mashed ripe banana.'] },
  { id: 'oats-apple', name: 'Oats with stewed apple', slots: ['breakfast'], ingredients: ['oats', 'apple'], steps: ['Cook oats in water until soft.', 'Stir in stewed, mashed apple.'] },
  { id: 'suji-upma', name: 'Suji upma, soft', slots: ['breakfast', 'snack'], ingredients: ['suji', 'carrot', 'peas', 'ghee'], steps: ['Roast suji in a little ghee.', 'Add water and finely grated vegetables.', 'Cook until soft.'] },
  { id: 'veg-poha', name: 'Vegetable poha', slots: ['breakfast', 'snack'], ingredients: ['poha', 'potato', 'peas', 'onion'], steps: ['Rinse poha until soft.', 'Cook with soft potato, peas and onion.'] },
  { id: 'idli', name: 'Soft idli', slots: ['breakfast', 'snack'], ingredients: ['idli', 'rice'], steps: ['Steam idlis.', 'Break into small soft pieces or mash with a little water.'] },
  { id: 'idli-dal', name: 'Idli with moong dal', slots: ['breakfast'], ingredients: ['idli', 'rice', 'dal'], steps: ['Steam idlis.', 'Serve with thin cooked moong dal for dipping.'] },
  { id: 'egg-scramble', name: 'Soft scrambled egg', slots: ['breakfast'], ingredients: ['egg', 'ghee'], steps: ['Cook the egg in a little ghee until fully set.', 'Break into small pieces.'] },
  { id: 'egg-tomato', name: 'Egg and tomato scramble', slots: ['breakfast'], ingredients: ['egg', 'tomato', 'onion'], steps: ['Cook onion and tomato until soft.', 'Add egg and cook until fully set.'] },
  { id: 'banana-mash', name: 'Mashed banana', slots: ['snack', 'breakfast'], ingredients: ['banana'], steps: ['Mash a ripe banana with a fork.'] },
  { id: 'papaya-mash', name: 'Mashed papaya', slots: ['snack'], ingredients: ['papaya'], steps: ['Mash ripe papaya until smooth.'] },
  { id: 'pear-puree', name: 'Stewed pear', slots: ['snack'], ingredients: ['pear'], steps: ['Steam peeled pear until soft.', 'Mash.'] },
  { id: 'apple-stew', name: 'Stewed apple', slots: ['snack'], ingredients: ['apple'], steps: ['Steam peeled apple until soft.', 'Mash.'] },
  { id: 'mango-curd', name: 'Mango and curd', slots: ['snack'], ingredients: ['mango', 'curd'], steps: ['Mash ripe mango.', 'Stir into curd.'] },
  { id: 'sweet-potato', name: 'Mashed sweet potato', slots: ['snack', 'lunch'], ingredients: ['sweetpotato', 'ghee'], steps: ['Steam sweet potato until soft.', 'Mash with a little ghee.'] },
  { id: 'beet-rice', name: 'Beetroot rice', slots: main, ingredients: ['rice', 'beetroot', 'ghee'], steps: ['Cook rice with grated beetroot until soft.', 'Finish with a little ghee.'] },
  { id: 'chikoo-mash', name: 'Mashed chikoo', slots: ['snack'], ingredients: ['chikoo'], steps: ['Scoop and mash ripe chikoo.'] },
  { id: 'avocado-mash', name: 'Mashed avocado', slots: ['snack'], ingredients: ['avocado'], steps: ['Mash ripe avocado until smooth.'] },
  { id: 'chapati-dal', name: 'Soft chapati in dal', slots: main, ingredients: ['wheat', 'dal', 'ghee'], steps: ['Tear a soft chapati into small pieces.', 'Soak in thin warm dal until soft.'] },
  { id: 'tofu-veg', name: 'Tofu and vegetable mash', slots: main, ingredients: ['tofu', 'carrot', 'peas'], steps: ['Steam the vegetables until soft.', 'Mash with soft tofu.'] },
  { id: 'peanut-porridge', name: 'Oats with peanut powder', slots: ['breakfast'], ingredients: ['oats', 'peanut', 'banana'], steps: ['Cook oats in water until soft.', 'Stir in a little smooth peanut powder and mashed banana.'] },
  { id: 'chicken-soup', name: 'Chicken and vegetable soup', slots: ['dinner'], ingredients: ['chicken', 'carrot', 'beans', 'onion'], steps: ['Simmer chicken and vegetables until very soft.', 'Shred finely or blend.'] },
];

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);
