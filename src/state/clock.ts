import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * The single clock (PRD 16.1). Everything time-dependent reads `now()`.
 * The demo controls shift it with an offset, so time keeps flowing from the
 * chosen moment and running timers stay live. The offset is persisted by the
 * store (see store.ts) and pushed in here on load.
 */

let offsetMs = 0;
const listeners = new Set<() => void>();

export function now(): Date {
  return new Date(Date.now() + offsetMs);
}

export function getClockOffset(): number {
  return offsetMs;
}

export function setClockOffset(ms: number): void {
  offsetMs = ms;
  listeners.forEach((l) => l());
}

/** Set the clock to a specific moment. */
export const setNow = (d: Date): void => setClockOffset(d.getTime() - Date.now());
/** Move the clock forward (or back) by ms. */
export const advanceClock = (ms: number): void => setClockOffset(offsetMs + ms);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Re-renders when the demo clock jumps. */
export function useClockOffset(): number {
  return useSyncExternalStore(subscribe, getClockOffset, getClockOffset);
}

/** Frozen time for the component gallery and screenshot tests. */
export const FrozenNow = createContext<Date | null>(null);

/**
 * Current demo time, re-rendered every `tickMs` and whenever the clock jumps.
 * Use 1000 for timers, 60_000 for "time since" labels.
 */
export function useNow(tickMs = 60_000): Date {
  const frozen = useContext(FrozenNow);
  const offset = useClockOffset();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  // Read the clock at render time, not at the last tick: a log written with now() must
  // never look like a future entry to the screen that re-renders because of it.
  return frozen ?? new Date(Date.now() + offset);
}
