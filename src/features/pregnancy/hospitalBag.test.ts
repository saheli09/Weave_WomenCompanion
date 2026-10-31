import { describe, expect, it } from 'vitest';
import { BAG_ITEM_IDS } from '../../content/birthPrep';
import { addBagItem, bagIds, bagList, type Checklist, packedItems, removeBagItem, restoreBagItems, toggleBagItem } from './hospitalBag';

const base: Checklist = { birthPlanShared: false, hospitalBag: 'not_started', bagItems: ['nightwear', 'charger'] };
const apply = (c: Checklist, p: Partial<Checklist> | undefined): Checklist => ({ ...c, ...p });

describe('hospital bag list', () => {
  it('starts as the suggested list', () => {
    expect(bagIds(base)).toEqual(BAG_ITEM_IDS);
    expect(packedItems(base)).toEqual(['nightwear', 'charger']);
  });

  it('reads an old checklist as all or none', () => {
    expect(packedItems({ birthPlanShared: false, hospitalBag: 'packed' })).toEqual(BAG_ITEM_IDS);
    expect(packedItems({ birthPlanShared: false, hospitalBag: 'not_started' })).toEqual([]);
  });

  it('adds her item to its group, unpacked; ignores empty text and repeats', () => {
    const c = apply(base, addBagItem(base, 'you', '  Glasses ', 'custom-1'));
    const you = bagList(c).find((g) => g.id === 'you')!;
    expect(you.items.at(-1)).toEqual({ id: 'custom-1', label: 'Glasses', custom: true });
    expect(bagIds(c)).toHaveLength(BAG_ITEM_IDS.length + 1);
    expect(packedItems(c)).toEqual(['nightwear', 'charger']);
    expect(addBagItem(c, 'you', 'glasses', 'custom-2')).toBeUndefined();
    expect(addBagItem(c, 'you', '   ', 'custom-3')).toBeUndefined();
    expect(addBagItem(c, 'baby', 'Glasses', 'custom-4')).toBeDefined();
  });

  it('removes suggested and own items, and drops them from packed', () => {
    let c = apply(base, addBagItem(base, 'papers', 'Birth certificate form', 'custom-1'));
    c = apply(c, toggleBagItem(c, 'custom-1'));
    c = apply(c, removeBagItem(c, 'charger'));
    expect(bagIds(c)).not.toContain('charger');
    expect(c.bagRemoved).toEqual(['charger']);
    expect(packedItems(c)).toEqual(['nightwear', 'custom-1']);
    c = apply(c, removeBagItem(c, 'custom-1'));
    expect(c.bagCustom).toEqual([]);
    expect(packedItems(c)).toEqual(['nightwear']);
    c = apply(c, restoreBagItems(c));
    expect(bagIds(c)).toEqual(BAG_ITEM_IDS);
    expect(packedItems(c)).toEqual(['nightwear']);
  });

  it('is packed when everything on her list is ticked', () => {
    let c = apply(base, { bagItems: BAG_ITEM_IDS.filter((id) => id !== 'car-seat') });
    c = apply(c, removeBagItem(c, 'car-seat'));
    expect(c.hospitalBag).toBe('packed');
    c = apply(c, addBagItem(c, 'baby', 'Muslin cloths', 'custom-1'));
    expect(c.hospitalBag).toBe('not_started');
  });
});
