import { differenceInMinutes, isSameDay, subDays } from 'date-fns';
import { addDaysISO, capitalise, formatDayMonth, formulaDaysLeft, numberWord, parseDate, pregnancyWeek } from '../domain/dates';
import { labourStats, practiceGapsByDay } from '../domain/labour';
import { currentPeriodDay, deriveStage } from '../domain/stage';
import { cycleLengths, cyclePhases, cycleTimeline, periodRuns } from '../domain/cycle';
import type { LogEntry } from '../domain/types';
import { doseSlotsToday } from '../state/selectors';
import type { InsightContext, Rule } from './engine';

/**
 * Rule catalogue (PRD 11.2), built stage by stage. Pregnancy step 1: R05, R09.
 */

/** Clock times that meal anchors stand for when deciding a dose is late. */
export const ANCHOR_TIMES: Record<string, [number, number]> = {
  breakfast: [9, 0],
  lunch: [13, 30],
  dinner: [20, 30],
  bedtime: [22, 30],
};
const SLOT_WORD: Record<string, string> = { breakfast: 'morning', lunch: 'afternoon', dinner: 'evening', bedtime: 'bedtime' };
/** "Well after its time" (R09). */
export const DOSE_LATE_MIN = 90;

/** R05: under six hours of her own sleep, four nights in a row. */
export const R05: Rule = {
  id: 'R05',
  evaluate: ({ state, now }) => {
    const herSleeps = state.logs.filter((l): l is Extract<LogEntry, { type: 'sleep' }> => l.type === 'sleep' && l.subject.kind === 'her' && Boolean(l.end));
    const nights = [0, 1, 2, 3].map((d) => {
      const day = subDays(now, d);
      const ended = herSleeps.filter((l) => isSameDay(parseDate(l.end!), day) && parseDate(l.end!) <= now);
      return ended.length ? ended.reduce((m, l) => m + differenceInMinutes(parseDate(l.end!), parseDate(l.start)), 0) : undefined;
    });
    if (nights.some((m) => m === undefined || m >= 360)) return [];
    const latest = herSleeps.map((l) => l.end!).sort().at(-1)!;
    return [{ id: `R05:${latest.slice(0, 10)}`, template: 'R05', scope: 'her', priority: 2, at: latest }];
  },
};

/** R09: a scheduled dose not logged well after its time. One card for the earliest missed dose. */
export const R09: Rule = {
  id: 'R09',
  evaluate: ({ state, now }) => {
    const subjects = [{ kind: 'her' as const }, ...state.children.map((c) => ({ kind: 'child' as const, childId: c.id }))];
    for (const subject of subjects) {
      for (const s of doseSlotsToday(state, now, subject)) {
        if (s.takenAt) continue;
        const due = new Date(now);
        if (s.slot in ANCHOR_TIMES) due.setHours(...ANCHOR_TIMES[s.slot]!, 0, 0);
        else {
          const [h, m] = s.slot.split(':').map(Number);
          due.setHours(h ?? 0, m ?? 0, 0, 0);
        }
        if (differenceInMinutes(now, due) < DOSE_LATE_MIN) continue;
        const slotWord = SLOT_WORD[s.slot] ?? `${s.slot}`;
        return [
          {
            id: `R09:${s.medicine.id}:${s.slot}:${now.toDateString()}`,
            template: 'R09',
            scope: subject.kind === 'her' ? 'her' : 'child',
            priority: 4,
            // "Not logged yet" is true as of now (11.1 ranking); doses keep their schedule order on ties.
            at: now.toISOString(),
            params: { Slot: capitalise(slotWord), medicine: s.medicine.name },
            effects: [`log_dose:${s.medicine.id}:${s.slot}`],
          },
        ];
      }
    }
    return [];
  },
};

/** R12: practice contractions with shortening gaps, week 37 or later, before Labour mode. */
export const R12: Rule = {
  id: 'R12',
  evaluate: ({ state, now }) => {
    const p = state.her.pregnancy;
    if (state.her.phase !== 'pregnancy' || !p || (p.labour && !p.labour.endedAt)) return [];
    if (pregnancyWeek(p.dueDate, now).week < 37) return [];
    const days = practiceGapsByDay(state.logs, now);
    if (days.length < 2) return [];
    const from = Math.round(days[0]!.avgGapMin);
    const to = Math.round(days.at(-1)!.avgGapMin);
    if (from - to < 2) return [];
    return [{ id: `R12:${days.at(-1)!.day}`, template: 'R12', scope: 'her', priority: 5, at: now.toISOString(), params: { from: numberWord(from), to: numberWord(to) }, effects: ['start_labour'] }];
  },
};

/** R13: Labour mode, all three signs met. Escalation (11.3). */
export const R13: Rule = {
  id: 'R13',
  evaluate: ({ state, now }) => {
    const labour = state.her.pregnancy?.labour;
    if (!labour || labour.endedAt) return [];
    const stats = labourStats(labour.contractions, now);
    if (stats.signsMet < 3) return [];
    return [{ id: `R13:${labour.startedAt}`, template: 'R13', scope: 'her', priority: 10, at: now.toISOString(), effects: ['call_provider'], topic: 'labour' }];
  },
};

/** Her most recent log of a type, up to now (and from `since`, if given). Ranks trend cards by their data. */
function lastLogAt(state: InsightContext['state'], now: Date, type: LogEntry['type'], since?: Date): string | undefined {
  return state.logs
    .filter((l) => l.type === type && l.subject.kind === 'her' && parseDate(l.at) <= now && (!since || parseDate(l.at) >= since))
    .map((l) => l.at)
    .sort()
    .at(-1);
}

/** Water glasses she logged today. */
function glassesToday(state: InsightContext['state'], now: Date): number {
  return state.logs.filter((l) => l.type === 'water' && l.subject.kind === 'her' && isSameDay(parseDate(l.at), now) && parseDate(l.at) <= now).reduce((n, l) => n + (l.type === 'water' ? l.glasses : 0), 0);
}

const EARLY_MORNING_H = 5;

/** R01 (both): three or more feeds since early morning and no water logged. Mother data meets baby data (1.4). */
export const R01: Rule = {
  id: 'R01',
  evaluate: ({ state, now }) => {
    if (now.getHours() < EARLY_MORNING_H || glassesToday(state, now) > 0) return [];
    const since = new Date(now);
    since.setHours(EARLY_MORNING_H, 0, 0, 0);
    const feeds = state.logs.filter((l) => l.type === 'feed' && l.subject.kind === 'child' && parseDate(l.at) >= since && parseDate(l.at) <= now);
    if (feeds.length < 3) return [];
    // "No water yet today" is true as of now, so the card is as new as now (11.1 ranking).
    return [{ id: `R01:${now.toDateString()}`, template: 'R01', scope: 'both', priority: 6, at: now.toISOString(), params: { Count: capitalise(numberWord(feeds.length)), time: `${EARLY_MORNING_H}am` }, effects: ['log_water'] }];
  },
};

const MID_AFTERNOON_H = 15;

/** R02 (her): below half of the water goal by mid-afternoon. Quiet when R01 already covers it. */
export const R02: Rule = {
  id: 'R02',
  evaluate: (ctx) => {
    const { state, now } = ctx;
    if (now.getHours() < MID_AFTERNOON_H || R01.evaluate(ctx).length) return [];
    const count = glassesToday(state, now);
    const goal = state.her.hydrationGoalGlasses;
    if (count >= goal / 2) return [];
    return [{ id: `R02:${now.toDateString()}`, template: 'R02', scope: 'her', priority: 3, at: now.toISOString(), params: { count: capitalise(numberWord(count)), goal: numberWord(goal) }, effects: ['log_water'] }];
  },
};

/** Weeks after birth that count as "the postpartum window" for R14. Needs clinical review. */
export const POSTPARTUM_WINDOW_WEEKS = 12;

/** R14 (her): heavy bleeding logged in the postpartum window, in the last 24 hours. Escalation (11.3). */
export const R14: Rule = {
  id: 'R14',
  evaluate: ({ state, now }) => {
    if (state.her.phase !== 'postpartum' || !state.her.postpartum) return [];
    const birth = state.births.find((b) => b.id === state.her.postpartum!.birthId);
    const from = parseDate(birth?.datetime ?? state.her.postpartum.startedAt);
    if (now.getTime() - from.getTime() > POSTPARTUM_WINDOW_WEEKS * 7 * 864e5) return [];
    const heavy = state.logs
      .filter((l) => l.type === 'bleeding' && l.level === 'heavy' && parseDate(l.at) <= now && now.getTime() - parseDate(l.at).getTime() < 864e5)
      .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    if (!heavy) return [];
    return [{ id: `R14:${heavy.id}`, template: 'R14', scope: 'her', priority: 10, at: heavy.at, effects: ['call_provider'], topic: 'heavy bleeding' }];
  },
};

/** Days before the discard date when reminders begin (9.15). */
export const TIN_REMINDER_DAYS = 7;

/**
 * R16 (child): an active formula tin is 7 days or fewer from its discard date,
 * including the day itself. R17: past the discard date, until she acts.
 * Both only exist for households that log tins (9.15 "Who sees it").
 */
export const R16: Rule = {
  id: 'R16',
  evaluate: ({ state, now }) =>
    state.formulaPacks
      .filter((p) => p.status === 'active')
      .map((p) => ({ p, left: formulaDaysLeft(p.discardBy, now) }))
      .filter(({ left }) => left >= 0 && left <= TIN_REMINDER_DAYS)
      .map(({ p, left }) => ({
        id: `R16:${p.id}:${left}`,
        template: left === 0 ? ('R16_today' as const) : left === 1 ? ('R16_one' as const) : ('R16' as const),
        scope: 'child' as const,
        priority: left <= 3 ? 7 : 4,
        timeLimited: true,
        // When it entered the seven-day window: the newest reminder ranks first.
        at: parseDate(addDaysISO(p.discardBy, -TIN_REMINDER_DAYS)).toISOString(),
        params: { opened: formatDayMonth(p.openedOn), discardBy: formatDayMonth(p.discardBy), DaysLeft: capitalise(numberWord(left)) },
        effects: [`close_tin:${p.id}:finished`, `close_tin:${p.id}:discarded`, 'snooze'],
      })),
};

export const R17: Rule = {
  id: 'R17',
  evaluate: ({ state, now }) =>
    state.formulaPacks
      .filter((p) => p.status === 'active' && formulaDaysLeft(p.discardBy, now) < 0)
      .map((p) => ({
        // Stable id so a 24 hour snooze holds, then the card returns until she acts (9.15).
        id: `R17:${p.id}`,
        template: 'R17' as const,
        scope: 'child' as const,
        priority: 8,
        timeLimited: true,
        at: parseDate(p.discardBy).toISOString(),
        params: { opened: formatDayMonth(p.openedOn), discardBy: formatDayMonth(p.discardBy) },
        effects: [`close_tin:${p.id}:discarded`, `close_tin:${p.id}:finished`, 'snooze'],
      })),
};

/** How far today must differ from the child's own recent average before R06 speaks. */
export const R06_THRESHOLD = 0.25;

const dayStart = (d: Date, back = 0) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - back);
  return x;
};

/**
 * R06 (child): today's feed gap or nap length differs from the child's own
 * average over the previous seven days. Never compared with anyone else (principle 8).
 * Milk-feed and nap patterns only, so not for toddlers.
 */
export const R06: Rule = {
  id: 'R06',
  evaluate: ({ state, now }) => {
    const out = [];
    for (const child of state.children) {
      if (deriveStage(child, now) === 'toddler') continue;
      const mine = state.logs.filter((l) => l.subject.kind === 'child' && l.subject.childId === child.id && parseDate(l.at) <= now);
      const milk = mine.filter((l) => l.type === 'feed' && l.mode !== 'solids').map((l) => parseDate(l.at).getTime()).sort((a, b) => a - b);
      const gaps = (from: Date, to: Date) => {
        const ts = milk.filter((t) => t >= from.getTime() && t < to.getTime());
        const g: number[] = [];
        for (let i = 1; i < ts.length; i++) g.push((ts[i]! - ts[i - 1]!) / 60_000);
        return g;
      };
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const today = gaps(dayStart(now), now);
      const before = gaps(dayStart(now, 7), dayStart(now));
      if (today.length >= 2 && before.length >= 10) {
        const ratio = avg(today) / avg(before);
        if (Math.abs(ratio - 1) >= R06_THRESHOLD) {
          out.push({ id: `R06:gap:${child.id}:${now.toDateString()}`, template: 'R06_gap' as const, scope: 'child' as const, priority: 2, at: now.toISOString(), params: { name: child.name, direction: ratio < 1 ? 'closer together' : 'further apart' } });
          continue;
        }
      }
      const naps = (from: Date, to: Date) =>
        mine
          .filter((l): l is Extract<LogEntry, { type: 'sleep' }> => l.type === 'sleep' && Boolean(l.end))
          .filter((l) => parseDate(l.end!) >= from && parseDate(l.end!) < to && parseDate(l.start).getHours() >= 7 && parseDate(l.start).getHours() < 19)
          .map((l) => differenceInMinutes(parseDate(l.end!), parseDate(l.start)));
      const napsToday = naps(dayStart(now), now);
      const napsBefore = naps(dayStart(now, 7), dayStart(now));
      if (napsToday.length >= 2 && napsBefore.length >= 7) {
        const ratio = avg(napsToday) / avg(napsBefore);
        if (Math.abs(ratio - 1) >= R06_THRESHOLD)
          out.push({ id: `R06:nap:${child.id}:${now.toDateString()}`, template: 'R06_nap' as const, scope: 'child' as const, priority: 2, at: now.toISOString(), params: { name: child.name, direction: ratio < 1 ? 'shorter' : 'longer' } });
      }
    }
    return out;
  },
};

const LEVEL_RANK = { spotting: 1, light: 2, medium: 3, heavy: 4 } as const;

/** Highest bleeding level she logged on each of the last `n` days (index 0 = today), undefined if none. */
export function dailyBleeding(state: InsightContext['state'], now: Date, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const day = dayStart(now, i);
    const levels = state.logs.filter((l) => l.type === 'bleeding' && l.subject.kind === 'her' && isSameDay(parseDate(l.at), day) && parseDate(l.at) <= now).map((l) => (l.type === 'bleeding' ? l.level : 'spotting'));
    return levels.sort((a, b) => LEVEL_RANK[b] - LEVEL_RANK[a])[0];
  });
}

/**
 * R04 (her): bleeding has eased for three days: each of the last three days is
 * lower than the day before them. Observation only; the PRD's "Week N usually
 * looks like this" is dropped (decision 2026-10-01).
 */
export const R04: Rule = {
  id: 'R04',
  evaluate: ({ state, now }) => {
    if (state.her.phase !== 'postpartum') return [];
    const d = dailyBleeding(state, now, 4); // today, 1, 2, 3 days ago
    const [a, b, c, before] = d;
    if (!a || !b || !c || !before) return [];
    const recent = Math.max(LEVEL_RANK[a], LEVEL_RANK[b], LEVEL_RANK[c]);
    if (recent >= LEVEL_RANK[before] || a === 'heavy') return [];
    // A trend: as new as the last bleeding log behind it.
    const last = lastLogAt(state, now, 'bleeding') ?? now.toISOString();
    return [{ id: `R04:${now.toDateString()}`, template: 'R04' as const, scope: 'her' as const, priority: 3, at: last, params: { Level: capitalise(a) } }];
  },
};

/** Pelvic floor weekly target (B21). Configurable; needs clinical review. */
export const PELVIC_WEEKLY_TARGET = 5;

export function pelvicSetsThisWeek(state: InsightContext['state'], now: Date): number {
  const monday = dayStart(now, (now.getDay() + 6) % 7);
  return state.logs.reduce((n, l) => (l.type === 'pelvic_floor' && parseDate(l.at) >= monday && parseDate(l.at) <= now ? n + l.sets : n), 0);
}

/** R10 (her): pelvic floor sets below the weekly target, from Thursday on. Postpartum only. */
export const R10: Rule = {
  id: 'R10',
  evaluate: ({ state, now }) => {
    if (state.her.phase !== 'postpartum') return [];
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday 0
    const done = pelvicSetsThisWeek(state, now);
    if (dayOfWeek < 3 || done >= PELVIC_WEEKLY_TARGET) return [];
    // A weekly count: as new as the last set she logged, or the start of the week.
    const last = lastLogAt(state, now, 'pelvic_floor', dayStart(now, dayOfWeek)) ?? dayStart(now, dayOfWeek).toISOString();
    return [{ id: `R10:${dayStart(now, dayOfWeek).toDateString()}`, template: 'R10' as const, scope: 'her' as const, priority: 1, at: last, params: { done: capitalise(numberWord(done)), target: numberWord(PELVIC_WEEKLY_TARGET) }, effects: ['log_pelvic'] }];
  },
};

/** R15 (her): low mood logged three days in a row in the postpartum window. Support, provider-first (11.3). */
export const R15: Rule = {
  id: 'R15',
  evaluate: ({ state, now }) => {
    if (state.her.phase !== 'postpartum') return [];
    const lowOn = (back: number) => {
      const moods = state.logs.filter((l) => l.type === 'mood' && l.subject.kind === 'her' && isSameDay(parseDate(l.at), dayStart(now, back)) && parseDate(l.at) <= now);
      const last = moods.sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      return last?.type === 'mood' && last.value === 'low';
    };
    if (![0, 1, 2].every(lowOn)) return [];
    return [{ id: `R15:${now.toDateString()}`, template: 'R15' as const, scope: 'her' as const, priority: 10, at: now.toISOString(), effects: ['support'], topic: 'low mood' }];
  },
};

/** R03 (her): period day one to three, with a water count. Softened claim, marked for review. */
export const R03: Rule = {
  id: 'R03',
  evaluate: ({ state, now }) => {
    const day = currentPeriodDay(state, now);
    if (!day || day > 3) return [];
    const count = glassesToday(state, now);
    if (count >= state.her.hydrationGoalGlasses) return [];
    return [{ id: `R03:${now.toDateString()}`, template: 'R03' as const, scope: 'her' as const, priority: 3, at: now.toISOString(), params: { day: numberWord(day), water: count === 0 ? 'no water' : count === 1 ? 'one glass' : `${numberWord(count)} glasses` }, effects: ['log_water'] }];
  },
};

/** "27 to 29 days", or "28 days each" when they match. */
const spanWords = (min: number, max: number) => (min === max ? `${min} days each` : `${min} to ${max} days`);

/**
 * R18 (her): today's note for someone tracking her cycle (decision 2026-10-30).
 * Something worth knowing about today, read from her own past cycles, that the
 * period card does not already say: how long her periods run, how steady her
 * cycles are, or the spread of days her next period could come. No action.
 * Only once Weave has estimates, and not after a birth or in pregnancy, where
 * her day is about other things.
 */
export const R18: Rule = {
  id: 'R18',
  evaluate: ({ state, now }) => {
    const her = state.her;
    if (her.phase !== 'cycle_tracking' || !her.cycle.active || state.children.length) return [];
    const days = her.cycle.periodDays ?? [];
    const timeline = cycleTimeline(days, now);
    const phases = cyclePhases(timeline, now);
    if (!timeline || !phases) return [];
    const lengths = cycleLengths(days);
    const k = numberWord(lengths.length);
    const base = { id: `R18:${now.toDateString()}`, scope: 'her' as const, priority: 2, at: now.toISOString() };
    const current = timeline.cycles.find((c) => c.start === phases.start)!;
    if (phases.today === 'period') {
      const past = periodRuns(days).slice(0, -1).map((r) => r.length);
      if (!past.length) return [];
      const avg = Math.round(past.reduce((a, b) => a + b, 0) / past.length);
      return [{ ...base, template: 'R18_period', params: { k: numberWord(past.length), span: spanWords(Math.min(...past), Math.max(...past)), date: formatDayMonth(addDaysISO(phases.start, avg - 1)) } }];
    }
    const span = spanWords(timeline.shortest, timeline.longest);
    if (phases.today === 'follicular') return [{ ...base, template: 'R18_follicular', params: { k, span, date: formatDayMonth(current.fertileStart) } }];
    if (phases.today === 'fertile' || phases.today === 'ovulation') return [{ ...base, template: 'R18_fertile', params: { k, span, date: formatDayMonth(current.fertileEnd) } }];
    const early = addDaysISO(phases.start, timeline.shortest);
    const late = addDaysISO(phases.start, timeline.longest);
    // "12 to 14 September", or "30 September to 2 October" across months.
    const earlyWords = early.slice(0, 7) === late.slice(0, 7) ? String(Number(early.slice(8))) : formatDayMonth(early);
    return [{ ...base, template: 'R18_luteal', params: { k, span, early: earlyWords, late: formatDayMonth(late) } }];
  },
};

/**
 * R02 is retired (decision 2026-10-30): it only repeated the water count the
 * Hydration tile shows. The tile now lights up when water is overdue
 * (waterNudge, state/selectors), and the cards that join water with other data
 * (R01 feeds, R03 period) stay.
 */
export const RULES: Rule[] = [R01, R03, R04, R05, R06, R09, R10, R12, R13, R14, R15, R16, R17, R18];
