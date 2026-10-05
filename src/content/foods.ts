/**
 * Food ids used by seed data. The full food and recipe library (30+ recipes,
 * PRD 9.9) is built in Phase 3. Allergen groups follow 9.9.
 */
export type AllergenGroup = 'egg' | 'peanut' | 'dairy' | 'wheat' | 'soy' | 'fish' | 'shellfish' | 'tree nuts' | 'sesame';

export const FOODS: Record<string, { name: string; allergen?: AllergenGroup }> = {
  rice: { name: 'rice' },
  dal: { name: 'dal' },
  ragi: { name: 'ragi' },
  carrot: { name: 'carrot' },
  potato: { name: 'potato' },
  banana: { name: 'banana' },
  chicken: { name: 'chicken' },
  egg: { name: 'egg', allergen: 'egg' },
  tomato: { name: 'tomato' },
  onion: { name: 'onion' },
  curd: { name: 'curd', allergen: 'dairy' },
};
