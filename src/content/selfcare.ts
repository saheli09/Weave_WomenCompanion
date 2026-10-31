import { copy, type CopyEntry, type Review } from './copy';

/**
 * Self-care library (decision 2026-10-30): exercise plans, short guided
 * routines (shown as videos; the player is a mock in the prototype), comfort
 * food, and a breathing exercise. Each item says which stages it suits, and
 * Self care shows only those. All of it needs clinical review before launch.
 */

/** Where she is: on her period, tracking her cycle, pregnant, or after a birth. */
export type CareStage = 'period' | 'cycle' | 'pregnancy' | 'postpartum';
export type CareTone = 'pink' | 'olive' | 'sage' | 'sand';

interface CareBase {
  id: string;
  title: CopyEntry;
  blurb: CopyEntry;
  minutes: number;
  for: CareStage[];
  /** After a birth, not before this postpartum week. */
  fromPostpartumWeek?: number;
  tone: CareTone;
  review: Review;
}

export interface CarePlan extends CareBase {
  kind: 'plan';
  /** Each entry is a day, or a week for longer plans. */
  unit?: 'day' | 'week';
  days: { title: CopyEntry; steps: CopyEntry[] }[];
}

export interface CareVideo extends CareBase {
  kind: 'video';
  steps: CopyEntry[];
}

export interface CareFood extends CareBase {
  kind: 'food';
  why: CopyEntry;
  ingredients: string[];
  steps: CopyEntry[];
}

export type CareItem = CarePlan | CareVideo | CareFood;

const review: Review = { kind: 'clinical', ref: '9.2', note: 'Self-care library' };
const b = (text: string) => copy(text, 'body');
const ALL: CareStage[] = ['period', 'cycle', 'pregnancy', 'postpartum'];

export const CARE_PLANS: CarePlan[] = [
  {
    kind: 'plan',
    id: 'pelvic-floor',
    title: copy('Pelvic floor, a week at a time', 'title'),
    blurb: b('Five minutes a day to rebuild strength after birth, lying down to start.'),
    minutes: 5,
    for: ['postpartum'],
    tone: 'sage',
    review,
    days: [
      { title: copy('Find the muscles', 'title'), steps: [b('Lie on your back, knees bent.'), b('Squeeze as if holding in wind, then let go fully.'), b('Five slow squeezes, a full breath between each.')] },
      { title: copy('Hold for three', 'title'), steps: [b('Squeeze and hold for a count of three.'), b('Release for a count of six.'), b('Repeat eight times.')] },
      { title: copy('Quick squeezes', 'title'), steps: [b('Ten quick squeezes and releases.'), b('Rest for a minute.'), b('Ten more.')] },
      { title: copy('Hold for five', 'title'), steps: [b('Squeeze and hold for a count of five.'), b('Release for a count of ten.'), b('Repeat eight times.')] },
      { title: copy('Sitting up', 'title'), steps: [b('Sit tall on a firm chair.'), b('Repeat the holds from day four.'), b('Add five quick squeezes at the end.')] },
      { title: copy('With your breath', 'title'), steps: [b('Breathe in and let your belly soften.'), b('Breathe out and gently squeeze.'), b('Ten breaths like this.')] },
      { title: copy('Every day from here', 'title'), steps: [b('Ten slow holds and ten quick squeezes.'), b('Pair it with something you do daily, like a feed.'), b('Leaking or heaviness after six weeks is worth raising with your doctor or midwife.')] },
    ],
  },
  {
    kind: 'plan',
    id: 'walk-further',
    unit: 'week',
    title: copy('Walk a little further', 'title'),
    blurb: b('Four weeks from ten minutes to thirty, at a pace where you can still talk.'),
    minutes: 10,
    for: ['cycle', 'period', 'pregnancy', 'postpartum'],
    fromPostpartumWeek: 6,
    tone: 'olive',
    review,
    days: [
      { title: copy('Week one: ten minutes', 'title'), steps: [b('Ten minutes, five days this week.'), b('An easy pace where you can still chat.')] },
      { title: copy('Week two: fifteen minutes', 'title'), steps: [b('Fifteen minutes, five days.'), b('Try one short slope if there is one nearby.')] },
      { title: copy('Week three: twenty minutes', 'title'), steps: [b('Twenty minutes, five days.'), b('Pick up the pace for one minute in the middle.')] },
      { title: copy('Week four: thirty minutes', 'title'), steps: [b('Thirty minutes, five days.'), b('Split it into two walks if that is easier.')] },
    ],
  },
  {
    kind: 'plan',
    id: 'pregnancy-stretch',
    title: copy('Ten minutes of pregnancy stretches', 'title'),
    blurb: b('Five days of gentle moves for hips, back and shoulders. No lying flat on your back.'),
    minutes: 10,
    for: ['pregnancy'],
    tone: 'pink',
    review,
    days: [
      { title: copy('Hips', 'title'), steps: [b('Sit on a cushion, soles of your feet together.'), b('Let your knees drop gently. Breathe for one minute.')] },
      { title: copy('Lower back', 'title'), steps: [b('On hands and knees, round your back, then let it sink.'), b('Ten slow rounds with your breath.')] },
      { title: copy('Shoulders and neck', 'title'), steps: [b('Roll your shoulders back ten times.'), b('Tilt each ear towards your shoulder, five breaths a side.')] },
      { title: copy('Legs', 'title'), steps: [b('Standing, hold a chair. Step one foot back, heel down.'), b('Hold for five breaths, then switch.')] },
      { title: copy('All together', 'title'), steps: [b('Two minutes of each move from the week.'), b('Stop if anything pulls or hurts.')] },
    ],
  },
  {
    kind: 'plan',
    id: 'cycle-move',
    title: copy('Move with your cycle', 'title'),
    blurb: b('A week of short sessions: gentle on period days, a little more as energy lifts.'),
    minutes: 15,
    for: ['cycle', 'period'],
    tone: 'sand',
    review,
    days: [
      { title: copy('Rest and stretch', 'title'), steps: [b('Child’s pose, cat-cow and a slow forward fold.'), b('Five breaths in each.')] },
      { title: copy('Easy walk', 'title'), steps: [b('Fifteen minutes outside at an easy pace.')] },
      { title: copy('Strength, part one', 'title'), steps: [b('Ten squats, ten wall push-ups, a twenty-second plank.'), b('Twice through.')] },
      { title: copy('Dance it out', 'title'), steps: [b('Three songs you like. Move however feels good.')] },
      { title: copy('Strength, part two', 'title'), steps: [b('Ten lunges a side, ten glute bridges, ten bird-dogs a side.'), b('Twice through.')] },
      { title: copy('Long walk', 'title'), steps: [b('Thirty minutes, somewhere green if you can.')] },
      { title: copy('Slow day', 'title'), steps: [b('Ten minutes of stretching before bed.')] },
    ],
  },
];

export const CARE_VIDEOS: CareVideo[] = [
  {
    kind: 'video',
    id: 'yoga-cramps',
    title: copy('Yoga for period cramps', 'title'),
    blurb: b('Child’s pose, knees to chest and a supported twist.'),
    minutes: 8,
    for: ['period', 'cycle'],
    tone: 'pink',
    review,
    steps: [b('Child’s pose, knees wide, a pillow under your chest. One minute.'), b('On your back, hug your knees and rock side to side. One minute.'), b('Knees to one side for a gentle twist. One minute each side.'), b('Legs up the wall, a warm pad on your belly. Three minutes.')],
  },
  {
    kind: 'video',
    id: 'wind-down',
    title: copy('Wind-down stretch for bed', 'title'),
    blurb: b('Slow moves and long breaths to help you drift off.'),
    minutes: 7,
    for: ALL,
    tone: 'sage',
    review,
    steps: [b('Sit cross-legged and roll your shoulders back. One minute.'), b('Fold forward over your legs and let your head hang. One minute.'), b('Side stretch, one arm overhead. One minute each side.'), b('Lie on your side, a pillow between your knees. Breathe out longer than you breathe in.')],
  },
  {
    kind: 'video',
    id: 'pregnancy-hips',
    title: copy('Hip openers for pregnancy', 'title'),
    blurb: b('Gentle moves for hips and lower back, nothing on your back.'),
    minutes: 10,
    for: ['pregnancy'],
    tone: 'olive',
    review,
    steps: [b('Cat-cow on hands and knees. Ten rounds.'), b('Wide-knee child’s pose with a cushion. One minute.'), b('Hip circles on hands and knees, five each way.'), b('Supported squat holding a chair. Five slow breaths.')],
  },
  {
    kind: 'video',
    id: 'postpartum-core',
    title: copy('Breathing and core after birth', 'title'),
    blurb: b('Reconnect with your deep core through breath. Gentle enough for the first days.'),
    minutes: 6,
    for: ['postpartum'],
    tone: 'sand',
    review,
    steps: [b('Lie on your back, knees bent, hands on your lower ribs.'), b('Breathe in and let your ribs widen.'), b('Breathe out and draw your belly gently in and up.'), b('Ten slow breaths. Rest, then ten more.')],
  },
  {
    kind: 'video',
    id: 'desk-release',
    title: copy('Neck and shoulders release', 'title'),
    blurb: b('For hours of feeding, holding or sitting at a desk.'),
    minutes: 4,
    for: ALL,
    tone: 'olive',
    review,
    steps: [b('Shoulder rolls, ten back and ten forward.'), b('Chin to chest, then slowly look up. Five times.'), b('Clasp your hands behind you and open your chest. Five breaths.')],
  },
];

export const CARE_FOODS: CareFood[] = [
  {
    kind: 'food',
    id: 'ginger-jaggery-tea',
    title: copy('Ginger and jaggery tea', 'title'),
    blurb: b('Warm, a little sweet, ready in five minutes.'),
    why: b('A warm drink can ease cramps for some people, and ginger may help with nausea.'),
    minutes: 5,
    for: ['period', 'cycle', 'pregnancy'],
    tone: 'sand',
    review,
    ingredients: ['1 cup water', '1 inch fresh ginger, grated', '1 tsp jaggery', 'A squeeze of lemon'],
    steps: [b('Boil the water with the ginger for three minutes.'), b('Stir in the jaggery until it melts.'), b('Strain, add lemon, sip warm.')],
  },
  {
    kind: 'food',
    id: 'palak-dal',
    title: copy('Palak dal', 'title'),
    blurb: b('Spinach and lentils with a garlic tadka.'),
    why: b('Lentils and spinach both bring iron. A squeeze of lemon helps your body take it in.'),
    minutes: 25,
    for: ALL,
    tone: 'olive',
    review,
    ingredients: ['½ cup moong or masoor dal', '2 cups spinach, chopped', '1 tomato', '2 cloves garlic', '½ tsp cumin, turmeric, salt', 'Lemon'],
    steps: [b('Pressure-cook the dal with turmeric and salt for two whistles.'), b('Fry cumin and garlic, add tomato, then spinach until it wilts.'), b('Stir into the dal, simmer two minutes, finish with lemon.')],
  },
  {
    kind: 'food',
    id: 'banana-peanut-toast',
    title: copy('Banana and peanut butter toast', 'title'),
    blurb: b('Two minutes, one hand. Energy that lasts a while.'),
    why: b('Quick to make between feeds or meetings, with protein to keep you going.'),
    minutes: 2,
    for: ALL,
    tone: 'pink',
    review,
    ingredients: ['1 slice wholegrain bread', '1 tbsp peanut butter', '½ banana', 'A pinch of cinnamon'],
    steps: [b('Toast the bread.'), b('Spread the peanut butter, slice the banana on top.'), b('Dust with cinnamon.')],
  },
  {
    kind: 'food',
    id: 'moong-khichdi',
    title: copy('Moong dal khichdi', 'title'),
    blurb: b('Soft, mild and easy on an unsettled stomach.'),
    why: b('Gentle food for days when nothing else appeals, with protein from the dal.'),
    minutes: 20,
    for: ALL,
    tone: 'sage',
    review,
    ingredients: ['¼ cup rice', '¼ cup moong dal', '1 tsp ghee', '½ tsp cumin, turmeric, salt', '3 cups water'],
    steps: [b('Rinse the rice and dal together.'), b('Warm the ghee, add cumin, then rice, dal, turmeric, salt and water.'), b('Pressure-cook for three whistles. Add water if you like it softer.')],
  },
  {
    kind: 'food',
    id: 'ragi-porridge',
    title: copy('Ragi porridge with dates', 'title'),
    blurb: b('A warm bowl you can eat with one hand.'),
    why: b('Ragi brings calcium and iron, and dates add sweetness without sugar.'),
    minutes: 10,
    for: ['postpartum', 'pregnancy', 'cycle'],
    tone: 'sand',
    review,
    ingredients: ['2 tbsp ragi flour', '1 cup milk or water', '3 dates, chopped', 'A pinch of cardamom'],
    steps: [b('Whisk the ragi into cold milk so it does not lump.'), b('Cook on low, stirring, for five minutes until thick.'), b('Stir in dates and cardamom.')],
  },
  {
    kind: 'food',
    id: 'dark-chocolate-nuts',
    title: copy('Dark chocolate and almonds', 'title'),
    blurb: b('A small treat for a period day.'),
    why: b('Dark chocolate and almonds bring magnesium, and a treat on a hard day counts too.'),
    minutes: 1,
    for: ['period', 'cycle'],
    tone: 'pink',
    review,
    ingredients: ['Two squares of dark chocolate', 'A small handful of almonds'],
    steps: [b('Sit down somewhere comfortable.'), b('Eat slowly.')],
  },
];

export const CARE_ITEMS: CareItem[] = [...CARE_PLANS, ...CARE_VIDEOS, ...CARE_FOODS];

export const careItem = (id: string) => CARE_ITEMS.find((x) => x.id === id);

/** The breathing exercise: box breathing, four counts each way. */
export const BREATHE = {
  rounds: 4,
  count: 4,
  phases: [copy('Breathe in', 'label'), copy('Hold', 'label'), copy('Breathe out', 'label'), copy('Hold', 'label')],
  review,
};
