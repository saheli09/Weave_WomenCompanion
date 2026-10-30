import { differenceInMinutes, isSameDay, subDays } from 'date-fns';
import { S } from '../content/strings';
import { fmt, type CopyEntry, type Review } from '../content/copy';
import { calendarDaysBetween, formatDayMonth, formatDuration, parseDate, pregnancyWeek, toISODate } from '../domain/dates';
import { currentPeriodDay, postpartumLabel } from '../domain/stage';
import { nextPeriodEstimate } from '../domain/cycle';
import { vitalsOn } from '../domain/devices';
import type { DomainState, LogEntry } from '../domain/types';
import { latestToday, waterToday } from '../state/selectors';
import { PELVIC_WEEKLY_TARGET, pelvicSetsThisWeek } from '../insights/rules';

/**
 * Self-care suggestions (decision 2026-10-30): a few small, kind things to try
 * today, each matched to her own logs and stage and saying why it is shown.
 * Rules, not a model: the same data always gives the same suggestions. Never a
 * diagnosis; anything that needs a person stays with the insights (11.3).
 */

export interface Suggestion {
  id: string;
  title: string;
  body: string;
  /** The data behind it, in her words: "you slept 4h 50m last night". */
  why: string;
  review?: Review;
  action?: { label: string; kind: 'water' } | { label: string; kind: 'route'; to: string };
}

/** At most this many, so the list stays a nudge, not a to-do list. */
export const MAX_SUGGESTIONS = 3;

const SHORT_NIGHT_MIN = 6 * 60;
const LOW_STEPS = 3000;
/** The day's water is spread from 7am to 9pm; this far behind that pace counts as behind. */
const WATER_BEHIND_BY = 2;

const make = (id: string, title: CopyEntry, body: CopyEntry, why: string, action?: Suggestion['action']): Suggestion => ({ id, title: title.text, body: body.text, why, review: title.review, action });

function lastNightMinutes(state: DomainState, now: Date): number | undefined {
  const night = state.logs
    .filter((l): l is Extract<LogEntry, { type: 'sleep' }> => l.type === 'sleep' && l.subject.kind === 'her' && Boolean(l.end) && isSameDay(parseDate(l.end!), now) && parseDate(l.end!) <= now)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return night ? differenceInMinutes(parseDate(night.end!), parseDate(night.start)) : undefined;
}

function waterBehind(state: DomainState, now: Date): boolean {
  const goal = state.her.hydrationGoalGlasses;
  const share = Math.min(1, Math.max(0, (now.getHours() * 60 + now.getMinutes() - 7 * 60) / (14 * 60)));
  return goal * share - waterToday(state, now) >= WATER_BEHIND_BY;
}

/** In priority order: her body today first, then rest, then small habits. */
export function suggestionsFor(state: DomainState, now: Date): Suggestion[] {
  const out: Suggestion[] = [];
  const her = state.her;
  const days = her.cycle.periodDays ?? [];

  const periodDay = currentPeriodDay(state, now);
  if (periodDay && periodDay <= 3) out.push(make('cramps', S.scCrampsTitle, S.scCrampsBody, fmt(S.scCrampsWhy, { n: periodDay }), { label: S.scTryIt.text, kind: 'route', to: '/me/care/video/yoga-cramps' }));

  const estimate = her.cycle.active && !periodDay ? nextPeriodEstimate(days) : undefined;
  if (estimate) {
    const until = calendarDaysBetween(toISODate(now), estimate);
    if (until >= 0 && until <= 3) out.push(make('period-soon', S.scPeriodSoonTitle, S.scPeriodSoonBody, fmt(S.scPeriodSoonWhy, { date: formatDayMonth(estimate) })));
  }

  const slept = lastNightMinutes(state, now);
  if (slept !== undefined && slept < SHORT_NIGHT_MIN) {
    const why = fmt(S.scSleepWhy, { duration: formatDuration(slept) });
    out.push(state.children.length ? make('rest', S.scRestBabyTitle, S.scRestBabyBody, why) : make('wind-down', S.scWindDownTitle, S.scWindDownBody, why, { label: S.scTryIt.text, kind: 'route', to: '/me/care/video/wind-down' }));
  }

  const mood = latestToday(state, now, 'mood');
  if (mood && (mood.value === 'low' || mood.value === 'flat')) out.push(make('mood', S.scMoodTitle, S.scMoodBody, fmt(S.scMoodWhy, { mood: mood.value }), { label: S.scBreatheAction.text, kind: 'route', to: '/me/care/breathe' }));

  const week = postpartumLabel(state, now);
  if (week !== undefined) {
    const done = pelvicSetsThisWeek(state, now);
    if (done < PELVIC_WEEKLY_TARGET) out.push(make('pelvic', S.scPelvicTitle, S.scPelvicBody, fmt(S.scPelvicWhy, { done, target: PELVIC_WEEKLY_TARGET }), { label: S.scPelvicAction.text, kind: 'route', to: '/me/pelvic' }));
  }

  if (her.phase === 'pregnancy' && her.pregnancy) {
    const pw = pregnancyWeek(her.pregnancy.dueDate, now).week;
    if (pw >= 28) out.push(make('feet-up', S.scFeetUpTitle, S.scFeetUpBody, fmt(S.scFeetUpWhy, { n: pw })));
  }

  if (waterBehind(state, now)) {
    out.push(make('water', S.scWaterTitle, S.scWaterBody, fmt(S.scWaterWhy, { n: waterToday(state, now), goal: her.hydrationGoalGlasses }), { label: S.scWaterAction.text, kind: 'water' }));
  }

  // A walk is not for the first weeks after birth.
  const yesterday = vitalsOn(state, toISODate(subDays(now, 1)));
  if (yesterday && yesterday.steps < LOW_STEPS && !(week !== undefined && week < 6)) out.push(make('walk', S.scWalkTitle, S.scWalkBody, fmt(S.scWalkWhy, { steps: yesterday.steps.toLocaleString() }), { label: S.scTryIt.text, kind: 'route', to: '/me/care/plan/walk-further' }));

  if (!out.length) out.push(make('breathe', S.scBreatheTitle, S.scBreatheBody, S.scBreatheWhy.text, { label: S.scBreatheAction.text, kind: 'route', to: '/me/care/breathe' }));
  return out.slice(0, MAX_SUGGESTIONS);
}
