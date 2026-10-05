import { differenceInMinutes, isSameDay, subDays } from 'date-fns';
import { capitalise, numberWord, parseDate, pregnancyWeek } from '../domain/dates';
import { labourStats, practiceGapsByDay } from '../domain/labour';
import type { LogEntry } from '../domain/types';
import { doseSlotsToday } from '../state/selectors';
import type { Rule } from './engine';

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
            at: due.toISOString(),
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

export const RULES: Rule[] = [R05, R09, R12, R13];
