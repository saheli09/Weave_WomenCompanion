import { addDaysISO, calendarDaysBetween, formulaDiscardBy, toISODate } from '../domain/dates';
import type { DomainState, FoodIntroduction, LogEntry, LogPayload, Medicine, Subject } from '../domain/types';
import { emptyState, iso } from '../domain/transitions';

/**
 * Seed personas D1 to D7 (PRD 3.3, plus D7: cycle tracking only). Each persona is written once against the
 * demo anchor, Thursday 27 August 2026, 10:30 (17.1 #3 resolution), then moved
 * to the demo clock's current time when it is loaded (`buildPersona(id, now)`),
 * so the last feed is minutes ago, not days, whatever time the clock shows.
 */

export const ANCHOR = new Date(2026, 7, 27, 10, 30, 0); // months are 0-based: 7 = August

export type PersonaId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7';

export const PERSONAS: { id: PersonaId; label: string; detail: string; priority: 'P0' | 'P1' }[] = [
  { id: 'D1', label: 'Pregnant, week 22', detail: 'Two prenatal medicines, appointment coming up', priority: 'P0' },
  { id: 'D2', label: 'Pregnant, week 40', detail: 'Practice contractions, Labour mode ready', priority: 'P0' },
  { id: 'D3', label: 'Postpartum, week 3', detail: 'Newborn, breast and formula, spotting easing', priority: 'P0' },
  { id: 'D4', label: 'Postpartum, week 7', detail: 'Period returned, cycle tracking on', priority: 'P0' },
  { id: 'D5', label: 'Toddler, 14 months', detail: 'Solids, new food, medicine course, tin due soon', priority: 'P0' },
  { id: 'D6', label: 'Pregnant again', detail: 'Week 16 with a 14-month-old', priority: 'P1' },
  { id: 'D7', label: 'Tracking cycle', detail: 'No pregnancy or baby, four cycles logged, day 12', priority: 'P1' },
];

const NAME = 'Saheli';
const CHILD = 'Srinika';
const PARTNER = 'Rick';
const PROVIDER = { name: 'Dr. Mahua', phone: '+91 00000 00000' }; // placeholder number, not real

/** Builder that keeps ids stable per persona so snapshots are deterministic. */
function builder(anchor: Date, state: DomainState) {
  let n = 0;
  const her: Subject = { kind: 'her' };
  const at = (daysAgo: number, hh: number, mm = 0) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hh, mm, 0, 0);
    return d;
  };
  const log = (subject: Subject, when: Date, payload: LogPayload, source: LogEntry['source'] = 'quick') => {
    state.logs.push({ id: `seed_${++n}`, subject, at: iso(when), source, ...payload } as LogEntry);
  };
  const child = (childId: string): Subject => ({ kind: 'child', childId });
  return { her, at, log, child };
}

function base(): DomainState {
  const s = emptyState(NAME, 'pregnancy');
  s.her.partnerName = PARTNER;
  s.her.provider = PROVIDER;
  return s;
}

const prenatalMeds = (): Medicine[] => [
  { id: 'med_cipcal', subject: { kind: 'her' }, name: 'Cipcal XT', doseText: '1 tab', schedule: { anchors: ['breakfast', 'dinner'] } },
  { id: 'med_ferrogen', subject: { kind: 'her' }, name: 'Ferrogen XT', doseText: '1 tab', schedule: { anchors: ['breakfast', 'dinner'] } },
];

/** Her own nights: under six hours four nights running (R05 seed for the pregnancy insight in Figma). */
function seedHerShortNights(b: ReturnType<typeof builder>, hours: number[]) {
  hours.forEach((h, i) => {
    const end = b.at(i, 6, 35);
    const start = new Date(end.getTime() - h * 3600_000);
    b.log(b.her, end, { type: 'sleep', start: iso(start), end: iso(end) }, 'sheet');
  });
}

/**
 * Seven earlier days of routine logs so the Baby tab trends and R06 have a
 * baseline. Deterministic: the same persona always gets the same history.
 */
function seedHistory(b: ReturnType<typeof builder>, childId: string, kind: 'newborn' | 'infant' | 'toddler', days = 7) {
  const c = b.child(childId);
  for (let d = 1; d <= days; d++) {
    if (kind === 'toddler') {
      b.log(c, b.at(d, 8, 0), { type: 'feed', mode: 'solids', slot: 'breakfast', foodIds: d % 2 ? ['ragi', 'banana'] : ['egg', 'tomato'] }, 'sheet');
      b.log(c, b.at(d, 12, 45), { type: 'feed', mode: 'solids', slot: 'lunch', foodIds: d % 3 ? ['rice', 'dal', 'carrot'] : ['rice', 'chicken', 'potato'] }, 'sheet');
      b.log(c, b.at(d, 19, 15), { type: 'feed', mode: 'solids', slot: 'dinner', foodIds: ['rice', 'dal', 'onion'] }, 'sheet');
      b.log(c, b.at(d, 21, 0), { type: 'feed', mode: 'bottle', ml: 180, content: 'formula' }, 'sheet');
      [7, 11, 15, 19].forEach((h) => b.log(c, b.at(d, h, 10), { type: 'diaper', kind: h === 11 ? 'dirty' : 'wet' }));
      b.log(c, b.at(d, 15, 0), { type: 'sleep', start: iso(b.at(d, 13, 30)), end: iso(b.at(d, 15, 0)) }, 'timer');
      // Night sleep that ended on the morning of day d (never touches today).
      b.log(c, b.at(d, 6, 30 + (d % 3) * 10), { type: 'sleep', start: iso(b.at(d + 1, 20, 40)), end: iso(b.at(d, 6, 30 + (d % 3) * 10)) }, 'timer');
      continue;
    }
    const gapH = kind === 'newborn' ? 3 : 3.5;
    for (let h = 1.5, i = 0; h < 24; h += gapH, i++) {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      b.log(c, b.at(d, hh, mm), { type: 'feed', mode: 'breast', side: (d + i) % 2 ? 'left' : 'right', minutes: 12 + ((d * 7 + i * 3) % 6) }, 'timer');
    }
    [2, 5, 8, 11, 14, 17, 20, 23].slice(0, kind === 'newborn' ? 8 : 6).forEach((h, i) => b.log(c, b.at(d, h, 20), { type: 'diaper', kind: i % 3 === 1 ? 'both' : 'wet' }));
    // Naps of about 1h 40m in the day, and a longer night stretch.
    [[8, 0], [11, 15], [14, 30], [17, 30]].forEach(([h, m]) => {
      const start = b.at(d, h!, m!);
      b.log(c, new Date(start.getTime() + 100 * 60_000), { type: 'sleep', start: iso(start), end: iso(new Date(start.getTime() + 100 * 60_000)) }, 'timer');
    });
  }
}

/**
 * A persona as it looks at `at`: built at the anchor, then every timestamp moves
 * by the same amount and every calendar date by the same number of days. Gaps
 * between logs, ages and days-left counts stay exactly as designed.
 */
export function buildPersona(id: PersonaId, at: Date = ANCHOR): DomainState {
  const s = buildAtAnchor(id);
  const ms = at.getTime() - ANCHOR.getTime();
  if (!ms) return s;
  return shiftDates(s, ms, calendarDaysBetween(ANCHOR, at));
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDates<T>(value: T, ms: number, days: number): T {
  if (typeof value === 'string') {
    if (DATE_TIME.test(value)) return new Date(new Date(value).getTime() + ms).toISOString() as T;
    if (DATE.test(value)) return addDaysISO(value, days) as T;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, ms, days)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftDates(v, ms, days)])) as T;
  return value;
}

function buildAtAnchor(id: PersonaId): DomainState {
  const anchor = ANCHOR;
  const today = toISODate(anchor);
  const s = base();
  const b = builder(anchor, s);

  switch (id) {
    case 'D7': {
      // Cycle tracking only: no pregnancy, no child. Four periods of five days, 27 to 29 days apart; today is day 12.
      s.her.phase = 'cycle_tracking';
      const starts = [94, 67, 38, 11];
      const periodDays = starts.flatMap((ago) => [0, 1, 2, 3, 4].map((i) => addDaysISO(today, -ago + i)));
      s.her.cycle = { active: true, lastPeriodStart: addDaysISO(today, -11), periodDays };
      const flows = ['medium', 'heavy', 'medium', 'light', 'spotting'] as const;
      starts.forEach((ago) => {
        flows.forEach((flow, i) => b.log(b.her, b.at(ago - i, 8, 0), { type: 'period', flow, event: i === 0 ? 'start' : 'day' }, 'sheet'));
        b.log(b.her, b.at(ago - 4, 21, 0), { type: 'period', flow: 'spotting', event: 'end' }, 'sheet');
      });
      b.log(b.her, b.at(0, 8, 0), { type: 'water', glasses: 1 });
      b.log(b.her, b.at(0, 9, 45), { type: 'water', glasses: 1 });
      b.log(b.her, b.at(0, 7, 30), { type: 'mood', value: 'good' });
      seedHerShortNights(b, [7.2, 6.8, 7.5]);
      return s;
    }
    case 'D1': {
      // Week 22 on 27 Aug 2026 -> due 31 Dec 2026 ("eighteen weeks to go").
      s.her.pregnancy = { dueDate: addDaysISO(today, 18 * 7), checklist: { birthPlanShared: true, hospitalBag: 'not_started' } };
      s.medicines = prenatalMeds();
      b.log(b.her, b.at(0, 9, 45), { type: 'dose', medicineId: 'med_cipcal', takenAt: iso(b.at(0, 9, 45)), slot: 'breakfast' }); // Figma shows 10:45am, after the 10:30 anchor
      b.log(b.her, b.at(0, 8, 10), { type: 'dose', medicineId: 'med_ferrogen', takenAt: iso(b.at(0, 8, 10)), slot: 'breakfast' });
      b.log(b.her, b.at(0, 9, 0), { type: 'water', glasses: 1 });
      b.log(b.her, b.at(0, 7, 30), { type: 'mood', value: 'ok' });
      seedHerShortNights(b, [5.5, 5.2, 4.8, 5.6]);
      // Appointment on the next Monday at 10:00 (Figma says "Monday 12 September", which is a Saturday in 2026).
      const appt = b.at(-18, 10, 0);
      s.appointments = [
        { id: 'appt_1', title: `Appointment with ${PROVIDER.name}`, at: iso(appt), source: 'user' },
      ];
      return s;
    }
    case 'D2': {
      // Week 40, day 2 -> due date two days ago.
      s.her.pregnancy = { dueDate: addDaysISO(today, -2), checklist: { birthPlanShared: true, hospitalBag: 'packed' } };
      // Practice contractions: gaps shorten from eleven minutes to seven over two days (R12).
      const series = [
        { day: 2, startH: 19, gap: 11, count: 4 },
        { day: 1, startH: 20, gap: 9, count: 5 },
        { day: 0, startH: 6, gap: 7, count: 5 },
      ];
      for (const p of series) {
        for (let i = 0; i < p.count; i++) {
          const t = b.at(p.day, p.startH, i * p.gap);
          b.log(b.her, t, { type: 'practice_contraction', durationSec: 35 + i * 3 }, 'timer');
        }
      }
      b.log(b.her, b.at(0, 8, 0), { type: 'water', glasses: 2 });
      return s;
    }
    case 'D3': {
      // Postpartum week 3: born 15 days before the anchor.
      const childId = 'child_srinika';
      const born = b.at(15, 15, 10);
      s.her.phase = 'postpartum';
      s.children = [{ id: childId, name: CHILD, dob: toISODate(born), feeding: ['breast', 'bottle'], photo: '/avatars/child.png' }];
      s.births = [{ id: 'birth_1', childId, name: CHILD, datetime: iso(born), place: 'Fortis Hospital, Kolkata', weightG: 3050 }];
      s.her.postpartum = { birthId: 'birth_1', startedAt: iso(born) };
      s.history = [{ dueDate: addDaysISO(toISODate(born), 3), endedAt: iso(born), outcome: 'birth', birthId: 'birth_1', appointments: [], medicineIds: ['med_cipcal', 'med_ferrogen'] }];
      s.medicines = prenatalMeds().map((m) => ({ ...m, archived: true }));
      const c = b.child(childId);
      b.log(c, born, { type: 'growth', weightG: 3050 }, 'derived');
      b.log(c, b.at(10, 11, 0), { type: 'growth', weightG: 2960, lengthCm: 49.5, headCm: 34.2 }, 'sheet');
      b.log(c, b.at(2, 11, 0), { type: 'growth', weightG: 3240, lengthCm: 50.6, headCm: 34.9 }, 'sheet');
      seedHistory(b, childId, 'newborn');
      s.vaccinations = [
        { childId, vaccineId: 'bcg', doneOn: toISODate(born) },
        { childId, vaccineId: 'opv0', doneOn: toISODate(born) },
        { childId, vaccineId: 'hepb1', doneOn: toISODate(born) },
      ];
      // Today: three feeds since 5am and no water yet (R01 seed; see FIGMA-DEVIATIONS.md).
      b.log(c, b.at(0, 5, 20), { type: 'feed', mode: 'breast', side: 'right', minutes: 15 }, 'timer');
      b.log(c, b.at(0, 6, 45), { type: 'sleep', start: iso(b.at(0, 1, 35)), end: iso(b.at(0, 6, 45)) }, 'timer');
      b.log(c, b.at(0, 7, 0), { type: 'feed', mode: 'bottle', ml: 60, content: 'formula' }, 'sheet');
      b.log(c, b.at(0, 8, 10), { type: 'sleep', start: iso(b.at(0, 7, 20)), end: iso(b.at(0, 8, 10)) }, 'timer');
      b.log(c, b.at(0, 9, 10), { type: 'feed', mode: 'breast', side: 'left', minutes: 10 }, 'timer');
      b.log(b.her, b.at(0, 9, 34), { type: 'bleeding', level: 'spotting' });
      b.log(c, b.at(0, 9, 40), { type: 'diaper', kind: 'wet' });
      b.log(c, b.at(0, 7, 5), { type: 'diaper', kind: 'both' });
      b.log(c, b.at(0, 5, 35), { type: 'diaper', kind: 'wet' });
      b.log(c, b.at(0, 2, 10), { type: 'diaper', kind: 'wet' });
      // Spotting easing over the last days (R04).
      ([[5, 'medium'], [4, 'light'], [3, 'light'], [2, 'spotting'], [1, 'spotting']] as const).forEach(([d, level]) =>
        b.log(b.her, b.at(d, 9, 0), { type: 'bleeding', level }),
      );
      b.log(b.her, b.at(2, 16, 0), { type: 'pelvic_floor', sets: 1 });
      b.log(b.her, b.at(1, 16, 0), { type: 'pelvic_floor', sets: 1 });
      seedHerShortNights(b, [4 + 10 / 60, 5.1, 4.6, 5.4]); // last night 4h 10m, as in the Figma timeline
      // One active formula tin, opened ten days ago.
      const openedOn = addDaysISO(today, -10);
      s.formulaPacks = [{ id: 'tin_1', childId, stage: 'Stage 1', sizeText: '400 g tin', openedOn, useWithinDays: 45, discardBy: formulaDiscardBy(openedOn, 45), status: 'active' }];
      return s;
    }
    case 'D4': {
      // Postpartum week 7: born 45 days before the anchor. Period came back two days ago.
      const childId = 'child_srinika';
      const born = b.at(45, 4, 25);
      s.her.phase = 'postpartum';
      s.children = [{ id: childId, name: CHILD, dob: toISODate(born), feeding: ['breast'], photo: '/avatars/child.png' }];
      s.births = [{ id: 'birth_1', childId, name: CHILD, datetime: iso(born), place: 'Fortis Hospital, Kolkata', weightG: 2980 }];
      s.her.postpartum = { birthId: 'birth_1', startedAt: iso(born) };
      s.history = [{ dueDate: addDaysISO(toISODate(born), -2), endedAt: iso(born), outcome: 'birth', birthId: 'birth_1', appointments: [], medicineIds: [] }];
      const periodStart = addDaysISO(today, -2);
      s.her.cycle = { active: true, lastPeriodStart: periodStart, periodDays: [periodStart, addDaysISO(today, -1), today] };
      const c = b.child(childId);
      b.log(c, born, { type: 'growth', weightG: 2980 }, 'derived');
      b.log(c, b.at(30, 11, 0), { type: 'growth', weightG: 3900, lengthCm: 53.5, headCm: 36.6 }, 'sheet');
      seedHistory(b, childId, 'infant');
      s.vaccinations = ['bcg', 'opv0', 'hepb1'].map((vaccineId) => ({ childId, vaccineId, doneOn: toISODate(born) }));
      b.log(b.her, b.at(2, 8, 0), { type: 'period', flow: 'medium', event: 'start' }, 'sheet');
      b.log(b.her, b.at(1, 8, 0), { type: 'period', flow: 'medium', event: 'day' }, 'sheet');
      b.log(b.her, b.at(0, 8, 15), { type: 'period', flow: 'light', event: 'day' }, 'sheet');
      b.log(c, b.at(0, 6, 0), { type: 'feed', mode: 'breast', side: 'left', minutes: 14 }, 'timer');
      b.log(c, b.at(0, 8, 40), { type: 'feed', mode: 'breast', side: 'right', minutes: 12 }, 'timer');
      b.log(c, b.at(0, 6, 20), { type: 'diaper', kind: 'wet' });
      b.log(c, b.at(0, 9, 5), { type: 'diaper', kind: 'dirty' });
      b.log(b.her, b.at(0, 9, 30), { type: 'water', glasses: 1 });
      b.log(b.her, b.at(0, 10, 0), { type: 'water', glasses: 1 });
      b.log(b.her, b.at(0, 7, 45), { type: 'mood', value: 'flat' });
      return s;
    }
    case 'D5':
    case 'D6': {
      // Toddler born 7 June 2025: "1y 2m 20d" on the anchor, as in the Figma pill.
      const childId = 'child_srinika';
      const dob = '2025-06-07';
      const born = new Date(2025, 5, 7, 7, 40);
      s.children = [{ id: childId, name: CHILD, dob, feeding: ['solids', 'bottle'], photo: '/avatars/child.png' }];
      s.births = [{ id: 'birth_1', childId, name: CHILD, datetime: iso(born), place: 'Fortis Hospital, Kolkata', weightG: 3100 }];
      s.history = [{ dueDate: '2025-06-10', endedAt: iso(born), outcome: 'birth', birthId: 'birth_1', appointments: [], medicineIds: [] }];
      s.her.units = { volume: 'oz', weight: 'kg' }; // the toddler Figma frame shows "7oz"
      const c = b.child(childId);
      b.log(c, born, { type: 'growth', weightG: 3100 }, 'derived');
      // Monthly weights: the child's own trajectory (no reference band; 9.12).
      [[1, 4100, 54], [2, 5000, 57.5], [4, 6300, 62], [6, 7200, 65.5], [9, 8100, 70], [12, 8900, 74]].forEach(([mo, g, cm]) => {
        const at = new Date(born);
        at.setMonth(at.getMonth() + mo!);
        b.log(c, at, { type: 'growth', weightG: g, lengthCm: cm }, 'sheet');
      });
      seedHistory(b, childId, 'toddler');
      s.vaccinations = ['bcg', 'opv0', 'hepb1', 'penta1', 'opv1', 'rota1', 'pcv1', 'penta2', 'opv2', 'rota2', 'penta3', 'opv3', 'rota3', 'pcv2', 'ipv1', 'mr1', 'pcv-b', 'je1'].map((vaccineId) => ({ childId, vaccineId, doneOn: '2025-12-01' }));
      // Foods introduced earlier with no reaction; curd introduced today (R07).
      const intro = (foodId: string, daysAgo: number, reaction: FoodIntroduction['reaction'] = 'none', allergenGroup?: string): FoodIntroduction => ({
        foodId, childId, firstOn: addDaysISO(today, -daysAgo), reaction, allergenGroup,
      });
      s.foodIntros = [
        intro('rice', 240), intro('dal', 230), intro('ragi', 220), intro('carrot', 210), intro('potato', 205),
        intro('banana', 200), intro('chicken', 120), intro('egg', 110, 'none', 'egg'), intro('tomato', 100), intro('onion', 100),
        intro('curd', 0, 'none_yet', 'dairy'),
      ];
      b.log(c, b.at(0, 7, 0), { type: 'feed', mode: 'bottle', ml: 210, content: 'formula' }, 'sheet');
      b.log(c, b.at(0, 8, 0), { type: 'feed', mode: 'solids', slot: 'breakfast', foodIds: ['ragi', 'banana'] }, 'sheet');
      b.log(c, b.at(0, 10, 15), { type: 'feed', mode: 'solids', slot: 'snack', foodIds: ['curd'] }, 'sheet');
      b.log(c, b.at(0, 6, 45), { type: 'sleep', start: iso(b.at(1, 20, 35)), end: iso(b.at(0, 6, 45)) }, 'timer');
      b.log(c, b.at(0, 9, 40), { type: 'diaper', kind: 'wet' });
      b.log(c, b.at(0, 6, 50), { type: 'diaper', kind: 'wet' });
      b.log(c, b.at(0, 8, 30), { type: 'diaper', kind: 'dirty' });
      b.log(c, b.at(0, 2, 30), { type: 'diaper', kind: 'wet' });
      b.log(b.her, b.at(0, 6, 35), { type: 'sleep', start: iso(b.at(1, 23, 25)), end: iso(b.at(0, 6, 35)) }, 'sheet');
      b.log(b.her, b.at(0, 9, 0), { type: 'water', glasses: 1 });
      // One active child medicine course (B17); doses are whatever her clinician said, typed by her.
      s.medicines = [
        { id: 'med_zinc', subject: c, name: 'Zinc syrup', doseText: '2.5 ml', schedule: { anchors: ['breakfast'] }, course: { days: 10, startedAt: iso(b.at(4, 8, 0)) } },
      ];
      for (let d = 4; d >= 0; d--) b.log(c, b.at(d, 8, 20), { type: 'dose', medicineId: 'med_zinc', takenAt: iso(b.at(d, 8, 20)), slot: 'breakfast' });
      // One formula tin five days from its discard date (R16).
      const openedOn = addDaysISO(today, -40);
      s.formulaPacks = [{ id: 'tin_1', childId, stage: 'Stage 3', sizeText: '400 g tin', openedOn, useWithinDays: 45, discardBy: formulaDiscardBy(openedOn, 45), status: 'active' }];

      if (id === 'D5') {
        s.her.phase = 'postpartum';
        s.her.postpartum = { birthId: 'birth_1', startedAt: iso(born) };
        // Period active, day 3, medium (Figma toddler frame), after six earlier cycles of
        // 27 to 30 days, so the cycle screen can show estimates (two completed cycles needed, 9.8).
        const periodStart = addDaysISO(today, -2);
        const past: { length: number; days: number }[] = [
          { length: 28, days: 5 }, // the cycle before the current one
          { length: 29, days: 4 },
          { length: 27, days: 5 },
          { length: 30, days: 5 },
          { length: 28, days: 4 },
          { length: 29, days: 5 },
        ];
        const pastDays: string[] = [];
        let start = periodStart;
        for (const c of past) {
          start = addDaysISO(start, -c.length);
          const back = calendarDaysBetween(start, today);
          (['light', 'medium', 'medium', 'light', 'spotting'] as const).slice(0, c.days).forEach((flow, i) => {
            pastDays.push(addDaysISO(start, i));
            b.log(b.her, b.at(back - i, 8, 0), { type: 'period', flow, event: i === 0 ? 'start' : 'day' }, 'sheet');
          });
        }
        s.her.cycle = { active: true, lastPeriodStart: periodStart, periodDays: [...pastDays.sort(), periodStart, addDaysISO(today, -1), today] };
        b.log(b.her, b.at(2, 8, 0), { type: 'period', flow: 'light', event: 'start' }, 'sheet');
        b.log(b.her, b.at(1, 8, 0), { type: 'period', flow: 'medium', event: 'day' }, 'sheet');
        b.log(b.her, b.at(0, 9, 34), { type: 'period', flow: 'medium', event: 'day' }, 'sheet');
        return s;
      }
      // D6: pregnant again, week 16, with the same 14-month-old. Cycle tracking paused, history kept.
      s.her.phase = 'pregnancy';
      s.her.pregnancy = { dueDate: addDaysISO(today, 24 * 7), checklist: { birthPlanShared: false, hospitalBag: 'not_started' } };
      s.her.cycle = { active: false, lastPeriodStart: addDaysISO(today, -16 * 7 + 14), periodDays: [] };
      s.medicines = [
        ...s.medicines,
        { id: 'med_folic', subject: { kind: 'her' }, name: 'Folic acid', doseText: '1 tab', schedule: { anchors: ['breakfast'] } },
      ];
      b.log(b.her, b.at(0, 8, 5), { type: 'dose', medicineId: 'med_folic', takenAt: iso(b.at(0, 8, 5)), slot: 'breakfast' });
      return s;
    }
  }
}
