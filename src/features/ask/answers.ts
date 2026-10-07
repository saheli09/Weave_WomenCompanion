import { differenceInMinutes, isSameDay, subDays } from 'date-fns';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { foodName } from '../../content/foods';
import { formatDayMonth, formatDuration, formatLongDate, formatTime, formatTimeSince, parseDate } from '../../domain/dates';
import { currentPeriodDay, primaryChild } from '../../domain/stage';
import type { DomainState } from '../../domain/types';
import { doseSlotsToday, feedCaption, lastFeed } from '../../state/selectors';

/**
 * Ask AI (B33, PRD 12), prototype: canned, state-aware, grounded in her own
 * logs. No model call. Health questions get a provider off-ramp; red-flag
 * phrases go to people (11.3). Nothing leaves the phone.
 */

export type Answer =
  | { kind: 'answer'; text: string }
  | { kind: 'health'; text: string }
  | { kind: 'redflag'; text: string }
  | { kind: 'unknown'; text: string };

/** Any mention of harming herself or her baby, or an emergency. Checked first, always. */
export const RED_FLAG = /\b(hurt|harm|kill)(ing)?\s+(myself|me|my\s+baby|the\s+baby|him|her)\b|suicid|end\s+(my|it\s+all)|don'?t\s+want\s+to\s+(live|be\s+here)|can'?t\s+go\s+on|not\s+breathing|stopped\s+breathing|unconscious|unresponsive|seizure|convuls|blue\s+lips/i;

/** Questions that ask for interpretation, reassurance or dosing. Deflected to the provider (12). */
export const HEALTH = /fever|temperature|rash|vomit|diarr|jaundice|yellow|infection|allerg|cough|wheez|breath|pain|hurt|bleed|clot|dose|how\s+much\s+(paracetamol|ibuprofen|medicine|syrup|drops)|is\s+(it|this|that)\s+(normal|ok|okay|safe|serious)|should\s+i\s+(worry|be\s+worried)|safe\s+to|sick|ill\b|diagnos/i;

export function suggestions(state: DomainState): string[] {
  const child = primaryChild(state);
  const name = child?.name ?? '';
  if (state.her.phase === 'pregnancy') return [S.askQAppointment.text, S.askQDoses.text, S.askQWaterToday.text];
  const toddler = child && state.foodIntros.some((f) => f.childId === child.id);
  if (toddler) return [fmt(S.askQFoodsWeek, { name }), state.formulaPacks.some((p) => p.status === 'active') ? S.askQTin.text : S.askQDoses.text, state.her.cycle.active ? S.askQPeriod.text : S.askQWaterToday.text];
  if (child) return [fmt(S.askQLastFeed, { name }), S.askQWaterYesterday.text, fmt(S.askQSleepToday, { name })];
  return [S.askQWaterToday.text, S.askQPeriod.text, S.askQAppointment.text];
}

export function answer(question: string, state: DomainState, now: Date): Answer {
  const q = question.toLowerCase();
  if (RED_FLAG.test(q)) return { kind: 'redflag', text: S.askRedFlag.text };
  const child = primaryChild(state);
  const name = child?.name ?? 'your child';
  const logs = state.logs.filter((l) => parseDate(l.at) <= now);
  const water = (d: Date) => logs.reduce((n, l) => (l.type === 'water' && isSameDay(parseDate(l.at), d) ? n + l.glasses : n), 0);

  // Logistics first: these are about her logs even when they mention a health word ("dose").
  if (/medicine|dose|tablet|pill|syrup/.test(q) && /left|today|remaining|taken|which/.test(q) && !/how\s+much/.test(q)) {
    const slots = [...doseSlotsToday(state, now, { kind: 'her' }), ...state.children.flatMap((c) => doseSlotsToday(state, now, { kind: 'child', childId: c.id }))];
    if (!slots.length) return { kind: 'answer', text: S.ansDosesNone.text };
    const left = slots.filter((s) => !s.takenAt);
    return { kind: 'answer', text: left.length ? fmt(S.ansDosesLeft, { list: left.map((s) => `${s.medicine.name} (${s.label})`).join(', ') }) : S.ansDosesDone.text };
  }
  if (HEALTH.test(q)) return { kind: 'health', text: S.askHealth.text };

  if (/\b(feed|feeds|fed|feeding|bottle|nurs\w*)\b/.test(q) && !/food|solid|week/.test(q) && child) {
    const f = lastFeed(state, now, child);
    return { kind: 'answer', text: f ? fmt(S.ansLastFeed, { name, time: formatTime(f.at), what: feedCaption(f, state.her.units), ago: formatTimeSince(f.at, now).toLowerCase() }) : fmt(S.ansNoFeed, { name }) };
  }
  if (/water|drink|glass|hydrat/.test(q)) {
    const yesterday = /yesterday/.test(q);
    const n = water(yesterday ? subDays(now, 1) : now);
    return { kind: 'answer', text: fmt(S.ansWater, { count: n, glasses: n === 1 ? 'glass' : 'glasses', when: yesterday ? 'yesterday' : 'today' }) };
  }
  if (/sleep|slept|nap/.test(q) && child) {
    const sleeps = logs.filter((l) => l.type === 'sleep' && l.subject.kind === 'child' && l.subject.childId === child.id && l.end && isSameDay(parseDate(l.end), now));
    const mins = sleeps.reduce((m, l) => m + (l.type === 'sleep' && l.end ? differenceInMinutes(parseDate(l.end), parseDate(l.start)) : 0), 0);
    return { kind: 'answer', text: sleeps.length ? fmt(S.ansSleepToday, { name, duration: formatDuration(mins), n: sleeps.length, sleeps: sleeps.length === 1 ? 'sleep' : 'sleeps' }) : fmt(S.ansSleepNone, { name }) };
  }
  if (/food|solid|eaten|meal|week/.test(q) && child) {
    const ids = new Set(logs.filter((l) => l.type === 'feed' && l.mode === 'solids' && now.getTime() - parseDate(l.at).getTime() < 7 * 864e5).flatMap((l) => (l.type === 'feed' && l.mode === 'solids' ? l.foodIds : [])));
    return { kind: 'answer', text: ids.size ? fmt(S.ansFoods, { name, foods: [...ids].map((i) => foodName(i, state.customFoods)).join(', ') }) : S.ansFoodsNone.text };
  }
  if (/tin|formula/.test(q)) {
    const tin = state.formulaPacks.filter((p) => p.status === 'active').sort((a, b) => (a.discardBy < b.discardBy ? -1 : 1))[0];
    return { kind: 'answer', text: tin ? fmt(S.ansTin, { opened: formatDayMonth(tin.openedOn), discard: formatDayMonth(tin.discardBy) }) : S.ansTinNone.text };
  }
  if (/appointment|doctor|check|scan/.test(q)) {
    const next = state.appointments.filter((a) => a.at && parseDate(a.at) >= now).sort((a, b) => (a.at! < b.at! ? -1 : 1))[0];
    return { kind: 'answer', text: next ? fmt(S.ansAppointment, { title: next.title, date: `${formatLongDate(next.at!)} at ${formatTime(next.at!)}` }) : S.ansAppointmentNone.text };
  }
  if (/period|cycle/.test(q)) {
    const d = currentPeriodDay(state, now);
    return { kind: 'answer', text: d ? fmt(S.ansPeriod, { n: d }) : S.ansPeriodNone.text };
  }
  if (/diaper|nappy|poo|pee|wet/.test(q) && child) {
    const n = logs.filter((l) => l.type === 'diaper' && l.subject.kind === 'child' && l.subject.childId === child.id && isSameDay(parseDate(l.at), now)).length;
    return { kind: 'answer', text: fmt(S.ansDiapers, { n, diapers: n === 1 ? 'diaper' : 'diapers', name }) };
  }
  return { kind: 'unknown', text: S.askUnknown.text };
}
