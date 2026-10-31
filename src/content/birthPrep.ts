import { copy, type CopyEntry, type Review } from './copy';

/**
 * Birth preparation content for the This week checklist (9.5, decision
 * 2026-10-30): a hospital bag packing list and the choices in a short birth
 * plan. Both need clinical review before launch.
 */

export const birthPrepReview: Review = { kind: 'clinical', ref: '9.5', note: 'Hospital bag list and birth plan choices' };

export type BagGroupId = 'you' | 'baby' | 'papers';

export interface BagGroup {
  id: BagGroupId;
  label: CopyEntry;
  items: { id: string; label: CopyEntry }[];
}

const item = (id: string, text: string) => ({ id, label: copy(text, 'label') });

export const HOSPITAL_BAG: BagGroup[] = [
  {
    id: 'you',
    label: copy('For you', 'label'),
    items: [
      item('nightwear', 'Two loose nightdresses that open at the front'),
      item('underwear', 'Comfortable underwear and maternity pads'),
      item('nursing-bra', 'Nursing bra'),
      item('slippers', 'Slippers and warm socks'),
      item('toiletries', 'Toiletries, hair ties and lip balm'),
      item('charger', 'Phone charger with a long cable'),
      item('snacks', 'Snacks and a water bottle'),
      item('going-home', 'Loose clothes to go home in'),
    ],
  },
  {
    id: 'baby',
    label: copy('For your baby', 'label'),
    items: [
      item('vests', 'Three vests and sleepsuits'),
      item('cap', 'A soft cap and socks'),
      item('nappies', 'Newborn nappies and wipes'),
      item('blanket', 'A soft blanket or swaddle'),
      item('car-seat', 'Car seat for the ride home'),
    ],
  },
  {
    id: 'papers',
    label: copy('Papers', 'label'),
    items: [
      item('hospital-file', 'Hospital file and scan reports'),
      item('id', 'ID and insurance card'),
      item('plan-copy', 'Your birth plan, printed or on your phone'),
    ],
  },
];

export const BAG_ITEM_IDS = HOSPITAL_BAG.flatMap((g) => g.items.map((i) => i.id));

/** The choices in a birth plan. Each is hers to change on the day; the plan is a starting point for the conversation. */
export const PAIN_RELIEF = [
  copy('Breathing and moving around', 'label'),
  copy('Warm water or a shower', 'label'),
  copy('Pain medicine', 'label'),
  copy('Epidural', 'label'),
  copy('Decide on the day', 'label'),
];

export const AFTER_BIRTH = [
  copy('Skin to skin straight away', 'label'),
  copy('Partner cuts the cord', 'label'),
  copy('Photos of the first moments', 'label'),
  copy('Quiet room, few visitors', 'label'),
];

export const FEEDING = [copy('Breastfeed', 'label'), copy('Formula', 'label'), copy('Both', 'label'), copy('Not sure yet', 'label')];
