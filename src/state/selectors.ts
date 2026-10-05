import { differenceInMinutes, isSameDay } from 'date-fns';
import { formatDuration, formatTime, formatTimeSince, parseDate, toISODate } from '../domain/dates';
import type { Child, DomainState, LogEntry, Medicine, Subject } from '../domain/types';
import { S } from '../content/strings';

/** Read-side helpers for screens. Pure: (state, now) -> view data. */

const isChild = (s: Subject, childId: string) => s.kind === 'child' && s.childId === childId;
const isHer = (s: Subject) => s.kind === 'her';

export const logsToday = (state: DomainState, now: Date): LogEntry[] =>
  state.logs.filter((l) => isSameDay(parseDate(l.at), now) && parseDate(l.at) <= now).sort((a, b) => (a.at < b.at ? 1 : -1));

export function lastOf<T extends LogEntry['type']>(state: DomainState, now: Date, type: T, pred: (l: Extract<LogEntry, { type: T }>) => boolean = () => true) {
  return state.logs
    .filter((l): l is Extract<LogEntry, { type: T }> => l.type === type && parseDate(l.at) <= now && pred(l as Extract<LogEntry, { type: T }>))
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
}

export function lastFeed(state: DomainState, now: Date, child: Child) {
  return lastOf(state, now, 'feed', (l) => isChild(l.subject, child.id));
}

export function lastMeal(state: DomainState, now: Date, child: Child) {
  return lastOf(state, now, 'feed', (l) => isChild(l.subject, child.id) && l.mode === 'solids');
}

export function feedCaption(l: Extract<LogEntry, { type: 'feed' }>, units: DomainState['her']['units']): string {
  if (l.mode === 'breast') return l.side;
  if (l.mode === 'bottle') return `${l.content} · ${volume(l.ml, units)}`;
  return 'solid meal';
}

export const volume = (ml: number, units: DomainState['her']['units']) => (units.volume === 'oz' ? `${Math.round(ml / 30)}oz` : `${ml} ml`);

export function diapersToday(state: DomainState, now: Date, child: Child): number {
  return logsToday(state, now).filter((l) => l.type === 'diaper' && isChild(l.subject, child.id)).length;
}

/** Sleep minutes that ended today (child or her). */
export function sleptToday(state: DomainState, now: Date, subject: Subject): number {
  return logsToday(state, now)
    .filter((l): l is Extract<LogEntry, { type: 'sleep' }> => l.type === 'sleep' && JSON.stringify(l.subject) === JSON.stringify(subject) && Boolean(l.end))
    .reduce((m, l) => m + differenceInMinutes(parseDate(l.end!), parseDate(l.start)), 0);
}

export function waterToday(state: DomainState, now: Date): number {
  return logsToday(state, now).reduce((n, l) => (l.type === 'water' && isHer(l.subject) ? n + l.glasses : n), 0);
}

export function latestToday<T extends LogEntry['type']>(state: DomainState, now: Date, type: T) {
  return logsToday(state, now).find((l): l is Extract<LogEntry, { type: T }> => l.type === type && isHer(l.subject));
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Medicines (9.5) ----------

export interface DoseSlot {
  medicine: Medicine;
  slot: string; // anchor or time
  label: string; // "1 tab after Breakfast"
  takenAt?: string;
}

export function doseSlotsToday(state: DomainState, now: Date, subject: Subject): DoseSlot[] {
  const today = logsToday(state, now);
  const todayISO = toISODate(now);
  const meds = state.medicines.filter((m) => !m.archived && (!m.startedOn || m.startedOn <= todayISO) && JSON.stringify(m.subject) === JSON.stringify(subject));
  const slots: DoseSlot[] = [];
  const order = ['breakfast', 'lunch', 'dinner', 'bedtime'];
  for (const m of meds) {
    const keys = 'times' in m.schedule ? m.schedule.times : m.schedule.anchors;
    for (const k of keys) {
      const taken = today.find((l) => l.type === 'dose' && l.medicineId === m.id && l.slot === k);
      slots.push({
        medicine: m,
        slot: k,
        label: 'times' in m.schedule ? `${m.doseText} at ${k}` : `${m.doseText} after ${cap(k)}`,
        takenAt: taken && taken.type === 'dose' ? taken.takenAt : undefined,
      });
    }
  }
  return slots.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
}

export function activeCourses(state: DomainState, now: Date): Medicine[] {
  return state.medicines.filter((m) => m.course && differenceInMinutes(now, parseDate(m.course.startedAt)) < m.course.days * 1440);
}

// ---------- Timeline (9.1 Today so far) ----------

export function timelineText(l: LogEntry, state: DomainState): string {
  switch (l.type) {
    case 'feed':
      return l.mode === 'breast' ? `Feed · ${l.side} · ${l.minutes} m` : `Feed · ${feedCaption(l, state.her.units)}`;
    case 'diaper':
      return `Diaper · ${l.kind === 'both' ? 'wet and dirty' : l.kind}`;
    case 'sleep':
      return l.end ? `Woke · ${formatDuration(differenceInMinutes(parseDate(l.end), parseDate(l.start)))} slept` : 'Fell asleep';
    case 'pump':
      return `Pump · ${l.side} · ${volume(l.ml, state.her.units)}`;
    case 'growth':
      return l.weightG ? `Weight · ${(l.weightG / 1000).toFixed(2)} kg` : 'Growth logged';
    case 'water':
      return `Water · ${l.glasses} ${l.glasses === 1 ? 'glass' : 'glasses'}`;
    case 'mood':
      return `Mood · ${l.value}`;
    case 'bleeding':
      return `Bleeding · ${l.level}`;
    case 'pelvic_floor':
      return `Pelvic floor · ${l.sets} ${l.sets === 1 ? 'set' : 'sets'}`;
    case 'pain':
      return `Pain · ${l.location}`;
    case 'period':
      return `Period · ${l.flow}`;
    case 'dose':
      return `${state.medicines.find((m) => m.id === l.medicineId)?.name ?? 'Medicine'} · taken`;
    case 'reaction':
      return `Reaction · ${l.severity}`;
    case 'note':
      return `Note · ${l.text}`;
    case 'weight':
      return `Weight · ${l.kg} kg`;
    case 'symptom':
      return `Symptom · ${l.name}`;
    case 'practice_contraction':
      return `Practice contraction · ${l.durationSec}s`;
  }
}

export function subjectLabel(subject: Subject, state: DomainState): { kind: 'child' | 'her'; label: string } {
  if (subject.kind === 'her') return { kind: 'her', label: S.herChip.text };
  return { kind: 'child', label: state.children.find((c) => c.id === subject.childId)?.name ?? 'Child' };
}

export function timelineItems(state: DomainState, now: Date) {
  return logsToday(state, now)
    .filter((l) => !(l.type === 'growth' && l.source === 'derived'))
    // Practice contractions are pregnancy content; after the handoff they live in Me, History (9.7).
    .filter((l) => l.type !== 'practice_contraction' || state.her.phase === 'pregnancy')
    .map((l) => ({ id: l.id, subject: subjectLabel(l.subject, state), text: timelineText(l, state), time: formatTime(l.at) }));
}

// ---------- Quick-log "time since" (5.2) ----------

export function sinceLast(state: DomainState, now: Date, match: (l: LogEntry) => boolean): string {
  const l = state.logs.filter((x) => match(x) && parseDate(x.at) <= now).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return l ? formatTimeSince(l.at, now) : S.tileNever.text;
}

export function greeting(now: Date, name: string): string {
  const h = now.getHours();
  const entry = h < 12 ? S.greetMorning : h < 17 ? S.greetAfternoon : S.greetEvening;
  return entry.text.replace('{name}', name);
}
