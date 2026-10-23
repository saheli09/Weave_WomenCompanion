import type { DomainState, ISODateTime, LogEntry, RunningTimers } from './types';
import { addLog, iso, TransitionError, uid } from './transitions';

/**
 * Feeds (9.4, S05 to S07, B04, B05). The breastfeed timer stores timestamps,
 * never counters (10.4), so it survives a reload and the demo clock.
 */

type Side = 'left' | 'right';
type Session = NonNullable<RunningTimers['breastfeed']>;

const elapsed = (start: ISODateTime, now: Date) => Math.max(0, (now.getTime() - new Date(start).getTime()) / 1000);

/** Seconds per side right now, including the side that is running. */
export function sessionSeconds(s: Session, now: Date): { left: number; right: number; total: number } {
  const run = s.running ? elapsed(s.running.start, now) : 0;
  const left = s.leftSec + (s.running?.side === 'left' ? run : 0);
  const right = s.rightSec + (s.running?.side === 'right' ? run : 0);
  return { left, right, total: left + right };
}

function withSession(state: DomainState, session: Session | undefined): DomainState {
  return { ...state, timers: { ...state.timers, breastfeed: session } };
}

/** Bank the running side's seconds and stop it. */
function bank(s: Session, now: Date): Session {
  if (!s.running) return s;
  const run = elapsed(s.running.start, now);
  return { ...s, leftSec: s.leftSec + (s.running.side === 'left' ? run : 0), rightSec: s.rightSec + (s.running.side === 'right' ? run : 0), running: undefined };
}

/**
 * Start or stop a side. Starting one side stops the other. Timers only start
 * on her action (10.2: never automatically).
 */
export function toggleBreastSide(state: DomainState, childId: string, side: Side, now: Date): DomainState {
  if (!state.children.some((c) => c.id === childId)) throw new TransitionError('Unknown child');
  const current = state.timers.breastfeed;
  if (current && current.childId !== childId) throw new TransitionError('A feed for another child is already running');
  const s: Session = current ?? { childId, sessionStart: iso(now), leftSec: 0, rightSec: 0 };
  if (s.running?.side === side) return withSession(state, bank(s, now));
  return withSession(state, { ...bank(s, now), running: { side, start: iso(now) } });
}

/** The pencil: set a side's minutes by hand (10.4 "editable after the fact"). */
export function setBreastMinutes(state: DomainState, childId: string, side: Side, minutes: number, now: Date): DomainState {
  const s: Session = state.timers.breastfeed ?? { childId, sessionStart: iso(now), leftSec: 0, rightSec: 0 };
  const banked = s.running?.side === side ? { ...s, running: undefined } : s;
  const sec = Math.max(0, Math.round(minutes * 60));
  return withSession(state, side === 'left' ? { ...banked, leftSec: sec } : { ...banked, rightSec: sec });
}

export function setSessionStart(state: DomainState, start: Date): DomainState {
  const s = state.timers.breastfeed;
  return s ? withSession(state, { ...s, sessionStart: iso(start) }) : state;
}

/** Save: one feed entry per side used, grouped. Minutes round to the nearest minute, at least one. */
export function saveBreastSession(state: DomainState, now: Date, note?: string): { state: DomainState; entries: LogEntry[] } {
  const s = state.timers.breastfeed;
  if (!s) throw new TransitionError('No feed to save');
  const done = bank(s, now);
  const groupId = uid('grp');
  let next = withSession(state, undefined);
  const entries: LogEntry[] = [];
  for (const side of ['left', 'right'] as const) {
    const sec = side === 'left' ? done.leftSec : done.rightSec;
    if (sec < 1) continue;
    const r = addLog(next, { kind: 'child', childId: s.childId }, { type: 'feed', mode: 'breast', side, minutes: Math.max(1, Math.round(sec / 60)) }, new Date(s.sessionStart), 'timer', { groupId, note: entries.length ? undefined : note });
    next = r.state;
    entries.push(r.entry);
  }
  if (!entries.length) throw new TransitionError('Nothing timed yet');
  return { state: next, entries };
}

export function discardBreastSession(state: DomainState): DomainState {
  return withSession(state, undefined);
}

/** Side used last (for the "last side" tag): the latest breast entry, latest side within a session. */
export function lastBreastSide(state: DomainState, childId: string, now: Date): Side | undefined {
  const feeds = state.logs
    .filter((l): l is Extract<LogEntry, { type: 'feed'; mode: 'breast' }> => l.type === 'feed' && l.mode === 'breast' && l.subject.kind === 'child' && l.subject.childId === childId && new Date(l.at) <= now)
    .sort((a, b) => (a.at === b.at ? (a.id < b.id ? 1 : -1) : a.at < b.at ? 1 : -1));
  return feeds[0]?.side;
}

export type FeedType = 'breast' | 'bottle' | 'solids' | 'combo';

/** Last-used feed type, for highlighting in the chooser (10.1). A breast and bottle pair sharing a group is a combo. */
export function lastFeedType(state: DomainState, childId: string, now: Date): FeedType | undefined {
  const feeds = state.logs
    .filter((l): l is Extract<LogEntry, { type: 'feed' }> => l.type === 'feed' && l.subject.kind === 'child' && l.subject.childId === childId && new Date(l.at) <= now)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const last = feeds[0];
  if (!last) return undefined;
  if (last.groupId) {
    const modes = new Set(feeds.filter((f) => f.groupId === last.groupId).map((f) => f.mode));
    if (modes.has('breast') && modes.has('bottle')) return 'combo';
  }
  return last.mode;
}

/** Last bottle amount and content, for prefilling (9.4). */
export function lastBottle(state: DomainState, childId: string): { ml: number; content: 'formula' | 'expressed' } | undefined {
  const b = state.logs
    .filter((l): l is Extract<LogEntry, { type: 'feed'; mode: 'bottle' }> => l.type === 'feed' && l.mode === 'bottle' && l.subject.kind === 'child' && l.subject.childId === childId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return b ? { ml: b.ml, content: b.content } : undefined;
}

export function logBottle(state: DomainState, childId: string, ml: number, content: 'formula' | 'expressed', at: Date, note?: string) {
  if (!(ml > 0 && ml <= 400)) throw new TransitionError('Amount out of range');
  return addLog(state, { kind: 'child', childId }, { type: 'feed', mode: 'bottle', ml, content }, at, 'sheet', { note });
}

/** Combo (B05): breast minutes plus a bottle, saved as one grouped pair. */
export function logCombo(state: DomainState, childId: string, input: { side: Side; minutes: number; ml: number; content: 'formula' | 'expressed' }, at: Date) {
  if (input.minutes < 1) throw new TransitionError('Breast minutes needed');
  const groupId = uid('grp');
  const a = addLog(state, { kind: 'child', childId }, { type: 'feed', mode: 'breast', side: input.side, minutes: input.minutes }, at, 'sheet', { groupId });
  const b = logBottle(a.state, childId, input.ml, input.content, at);
  const withGroup = { ...b.state, logs: b.state.logs.map((l) => (l.id === b.entry.id ? { ...l, groupId } : l)) };
  return { state: withGroup, entries: [a.entry, { ...b.entry, groupId }] };
}
