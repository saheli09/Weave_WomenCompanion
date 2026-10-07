/**
 * Food catalogue for solids (B12, 9.9). Allergen groups follow PRD 9.9.
 * New foods typed by her are added at runtime with a slug id.
 */
export type AllergenGroup = 'egg' | 'peanut' | 'dairy' | 'wheat' | 'soy' | 'fish' | 'shellfish' | 'tree nuts' | 'sesame';

export const FOODS: Record<string, { name: string; allergen?: AllergenGroup }> = {
  rice: { name: 'rice' },
  dal: { name: 'moong dal' },
  masoor: { name: 'masoor dal' },
  ragi: { name: 'ragi' },
  oats: { name: 'oats' },
  suji: { name: 'suji', allergen: 'wheat' },
  wheat: { name: 'wheat atta', allergen: 'wheat' },
  poha: { name: 'poha' },
  idli: { name: 'idli batter' },
  carrot: { name: 'carrot' },
  potato: { name: 'potato' },
  sweetpotato: { name: 'sweet potato' },
  pumpkin: { name: 'pumpkin' },
  bottlegourd: { name: 'bottle gourd' },
  spinach: { name: 'spinach' },
  beans: { name: 'green beans' },
  peas: { name: 'green peas' },
  beetroot: { name: 'beetroot' },
  tomato: { name: 'tomato' },
  onion: { name: 'onion' },
  banana: { name: 'banana' },
  apple: { name: 'apple' },
  pear: { name: 'pear' },
  papaya: { name: 'papaya' },
  mango: { name: 'mango' },
  chikoo: { name: 'chikoo' },
  avocado: { name: 'avocado' },
  dates: { name: 'dates' },
  chicken: { name: 'chicken' },
  fish: { name: 'fish', allergen: 'fish' },
  egg: { name: 'egg', allergen: 'egg' },
  curd: { name: 'curd', allergen: 'dairy' },
  paneer: { name: 'paneer', allergen: 'dairy' },
  ghee: { name: 'ghee', allergen: 'dairy' },
  peanut: { name: 'peanut powder', allergen: 'peanut' },
  almond: { name: 'almond powder', allergen: 'tree nuts' },
  sesame: { name: 'sesame', allergen: 'sesame' },
  tofu: { name: 'tofu', allergen: 'soy' },
  prawn: { name: 'prawn', allergen: 'shellfish' },
  jaggery: { name: 'jaggery' },
};

export const foodName = (id: string, custom?: Record<string, string>) => FOODS[id]?.name ?? custom?.[id] ?? id.replace(/-/g, ' ');
export const slugFood = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
