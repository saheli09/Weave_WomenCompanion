import type { DomainState, LogEntry, Subject } from './types';
import { addLog, iso, TransitionError } from './transitions';

/** Sleep timer (B06). One running sleep at a time, stored as a start timestamp (10.4). */

export function startSleep(state: DomainState, subject: Subject, now: Date): DomainState {
  if (state.timers.sleep) throw new TransitionError('A sleep is already running');
  if (subject.kind === 'child' && !state.children.some((c) => c.id === subject.childId)) throw new TransitionError('Unknown child');
  return { ...state, timers: { ...state.timers, sleep: { subject, start: iso(now) } } };
}

export function endSleep(state: DomainState, now: Date): { state: DomainState; entry: LogEntry } {
  const t = state.timers.sleep;
  if (!t) throw new TransitionError('No sleep running');
  const cleared = { ...state, timers: { ...state.timers, sleep: undefined } };
  return addLog(cleared, t.subject, { type: 'sleep', start: t.start, end: iso(now) }, now, 'timer');
}

export function cancelSleep(state: DomainState): DomainState {
  return { ...state, timers: { ...state.timers, sleep: undefined } };
}

/** A sleep that already happened. Up to 16 hours, ending no later than now. */
export function logPastSleep(state: DomainState, subject: Subject, start: Date, end: Date, now: Date) {
  if (end <= start) throw new TransitionError('Sleep must end after it starts');
  if (end.getTime() > now.getTime() + 60_000) throw new TransitionError('Sleep cannot end in the future');
  if (end.getTime() - start.getTime() > 16 * 3600_000) throw new TransitionError('Sleep longer than 16 hours');
  return addLog(state, subject, { type: 'sleep', start: iso(start), end: iso(end) }, end, 'sheet');
}
