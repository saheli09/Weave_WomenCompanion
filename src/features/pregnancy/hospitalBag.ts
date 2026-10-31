import { BAG_ITEM_IDS, HOSPITAL_BAG, type BagGroupId } from '../../content/birthPrep';
import type { DomainState } from '../../domain/types';

/**
 * The hospital bag list she can make her own (decision 2026-10-31): the
 * suggested items minus the ones she took off, plus the ones she added. Each
 * change returns a checklist patch for setChecklist, with the packed ids and
 * the packed status kept in step with the list.
 */

export type Checklist = NonNullable<NonNullable<DomainState['her']['pregnancy']>['checklist']>;

export interface BagListItem {
  id: string;
  label: string;
  custom: boolean;
}

export interface BagListGroup {
  id: BagGroupId;
  label: string;
  items: BagListItem[];
}

export function bagList(c: Checklist): BagListGroup[] {
  const removed = new Set(c.bagRemoved ?? []);
  return HOSPITAL_BAG.map((g) => ({
    id: g.id,
    label: g.label.text,
    items: [
      ...g.items.filter((i) => !removed.has(i.id)).map((i) => ({ id: i.id, label: i.label.text, custom: false })),
      ...(c.bagCustom ?? []).filter((i) => i.group === g.id).map((i) => ({ id: i.id, label: i.label, custom: true })),
    ],
  }));
}

export const bagIds = (c: Checklist): string[] => bagList(c).flatMap((g) => g.items.map((i) => i.id));

/** Packed ids still on her list. A checklist saved before items existed counts as all or none. */
export function packedItems(c: Checklist): string[] {
  const ids = bagIds(c);
  return (c.bagItems ?? (c.hospitalBag === 'packed' ? ids : [])).filter((id) => ids.includes(id));
}

function withBag(c: Checklist, change: Partial<Checklist>): Partial<Checklist> {
  const next = { ...c, ...change };
  const ids = bagIds(next);
  const packed = (change.bagItems ?? packedItems(c)).filter((id) => ids.includes(id));
  return { ...change, bagItems: packed, hospitalBag: ids.length && packed.length >= ids.length ? 'packed' : 'not_started' };
}

export function toggleBagItem(c: Checklist, id: string): Partial<Checklist> {
  const packed = packedItems(c);
  return withBag(c, { bagItems: packed.includes(id) ? packed.filter((x) => x !== id) : [...packed, id] });
}

/** Adds her item to a group. Empty text, or an item already in that group, changes nothing. */
export function addBagItem(c: Checklist, group: BagGroupId, text: string, id: string): Partial<Checklist> | undefined {
  const label = text.trim().replace(/\s+/g, ' ');
  if (!label) return undefined;
  const inGroup = bagList(c).find((g) => g.id === group)?.items ?? [];
  if (inGroup.some((i) => i.label.toLowerCase() === label.toLowerCase())) return undefined;
  return withBag(c, { bagCustom: [...(c.bagCustom ?? []), { id, group, label }] });
}

export function removeBagItem(c: Checklist, id: string): Partial<Checklist> {
  const packed = packedItems(c).filter((x) => x !== id);
  if (BAG_ITEM_IDS.includes(id)) return withBag(c, { bagItems: packed, bagRemoved: [...(c.bagRemoved ?? []), id] });
  return withBag(c, { bagItems: packed, bagCustom: (c.bagCustom ?? []).filter((i) => i.id !== id) });
}

/** Brings back the suggested items she took off, unpacked. */
export const restoreBagItems = (c: Checklist): Partial<Checklist> => withBag(c, { bagRemoved: [] });
