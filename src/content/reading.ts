import { copy, type CopyEntry, type Review } from './copy';

/**
 * Week reading cards (PRD 9.5). Three per week: food, movement, body.
 * Week 22 is taken from the Figma frame. The library for weeks 20 to 40 is
 * filled in Phase 2. All of it needs clinical review.
 */

export interface ReadingCard {
  id: string;
  week: number;
  category: 'food' | 'movement' | 'body';
  headline: CopyEntry;
  body: CopyEntry;
  review: Review;
}

const review: Review = { kind: 'clinical', ref: '9.5', note: 'Week reading content' };

export const READING: ReadingCard[] = [
  {
    id: 'w22-food',
    week: 22,
    category: 'food',
    headline: copy('Iron absorbs better with something sour', 'headline'),
    body: copy('Orange, tomato, lemon on greens. Tea and coffee within the hour work against it.', 'body'),
    review,
  },
  {
    id: 'w22-movement',
    week: 22,
    category: 'movement',
    headline: copy('Lying flat gets less comfortable from here', 'headline'),
    body: copy('Side-lying stretches and twenty minutes of walking do more than a longer session once a week.', 'body'),
    review,
  },
  {
    id: 'w22-body',
    week: 22,
    category: 'body',
    headline: copy('Pelvic floor, three times a day', 'headline'),
    body: copy('Starting now is what makes recovery easier later. Ten slow, ten quick.', 'body'),
    review,
  },
];

export const readingForWeek = (week: number): ReadingCard[] => READING.filter((r) => r.week === week);
