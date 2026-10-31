import { addDaysISO, childAge, toISODate } from './dates';
import type { DomainState, ISODate, LogEntry } from './types';
import { iso } from './transitions';

/**
 * Connected apps (PRD-ADDITION, decision 2026-10-29). UI only, like sharing
 * (B34): wearables stay out of the prototype's scope, and a web app cannot
 * reach Apple Health or Health Connect. Connecting fills in sample readings on
 * this phone, the way a tracker would: her sleep as ordinary sleep entries,
 * and one summary a day for resting heart rate, skin temperature and steps.
 * Nothing leaves the phone. Her baby's sleep stays hers to log.
 */

export type DeviceId = 'apple_health' | 'health_connect' | 'fitbit' | 'oura';

export const DEVICES: { id: DeviceId; name: string }[] = [
  { id: 'apple_health', name: 'Apple Health' },
  { id: 'health_connect', name: 'Health Connect' },
  { id: 'fitbit', name: 'Fitbit' },
  { id: 'oura', name: 'Oura' },
];

export const deviceName = (id: DeviceId) => DEVICES.find((d) => d.id === id)!.name;

/** One day's summary from the tracker. Steps for today grow as the day goes on. */
export interface VitalsDay {
  date: ISODate;
  device: DeviceId;
  restingHr: number;
  /** Degrees C above (+) or below (-) her usual night-time skin temperature. */
  skinTempDelta: number;
  steps: number;
}

/** How far back a new connection brings readings in. */
export const IMPORT_DAYS = 14;

/** Same date and device, same reading: seeds and tests stay deterministic. */
function rand(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** A baby under six months means short, broken nights; late pregnancy a little short too. */
function sleepRangeHours(state: DomainState, now: Date): [number, number] {
  if (state.children.some((c) => childAge(c.dob, now).totalMonths < 6)) return [4.5, 6.2];
  if (state.her.phase === 'pregnancy') return [5.8, 7.4];
  return [6.4, 8];
}

/**
 * One app at a time. A new app takes over the window it imports, so a chart or
 * a run of nights never mixes two trackers' numbers; older readings stay, as
 * the new app has nothing to put in their place. Her own entries are untouched.
 */
export function connectDevice(state: DomainState, device: DeviceId, now: Date): DomainState {
  const from = addDaysISO(toISODate(now), -(IMPORT_DAYS - 1));
  const otherInWindow = (d: DeviceId | undefined, date: ISODate) => d !== undefined && d !== device && date >= from;
  return syncDevices(
    {
      ...state,
      devices: { connected: device, connectedAt: iso(now) },
      logs: state.logs.filter((l) => !(l.source === 'device' && l.type === 'sleep' && otherInWindow(l.device, toISODate(new Date(l.end ?? l.at))))),
      vitals: state.vitals?.filter((v) => !otherInWindow(v.device, v.date)),
    },
    now,
  );
}

/** Readings already brought in stay; new ones stop. */
export function disconnectDevice(state: DomainState): DomainState {
  return { ...state, devices: undefined };
}

/**
 * Bring in whatever the tracker would have by `now`: each night's sleep once
 * she has woken, and a summary for each day. Returns the same state when there
 * is nothing new, so it is safe to call on every tick.
 */
export function syncDevices(state: DomainState, now: Date): DomainState {
  const device = state.devices?.connected;
  if (!device) return state;
  const today = toISODate(now);
  const [lo, hi] = sleepRangeHours(state, now);
  const herSleepEnds = new Set(state.logs.filter((l) => l.type === 'sleep' && l.subject.kind === 'her' && l.end).map((l) => toISODate(new Date((l as Extract<LogEntry, { type: 'sleep' }>).end!))));
  const sleeping = state.timers.sleep?.subject.kind === 'her';
  const newLogs: LogEntry[] = [];
  const vitals = [...(state.vitals ?? [])];
  let changed = false;

  for (let i = IMPORT_DAYS - 1; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const [rWake, rSleep, rHr, rTemp, rSteps] = Array.from({ length: 5 }, rand(`${device}:${date}`));
    // Her night ending this morning, unless she logged one herself.
    const wake = new Date(`${date}T06:00:00`);
    wake.setMinutes(Math.round(rWake! * 80));
    if (wake <= now && !herSleepEnds.has(date) && !(i === 0 && sleeping)) {
      const start = new Date(wake.getTime() - (lo + rSleep! * (hi - lo)) * 3600_000);
      newLogs.push({ id: `dev_${device}_${date}_${state.logs.length + newLogs.length}`, subject: { kind: 'her' }, at: iso(wake), source: 'device', device, type: 'sleep', start: iso(start), end: iso(wake) });
    }
    const dayShare = i === 0 ? Math.min(1, Math.max(0, (now.getHours() * 60 + now.getMinutes() - 7 * 60) / (14 * 60))) : 1;
    const reading: VitalsDay = {
      date,
      device,
      restingHr: Math.round(57 + rHr! * 9),
      skinTempDelta: Math.round((rTemp! * 0.6 - 0.25) * 10) / 10,
      steps: Math.round((3200 + rSteps! * 6400) * dayShare),
    };
    const at = vitals.findIndex((v) => v.date === date && v.device === device);
    if (at < 0) {
      vitals.push(reading);
      changed = true;
    } else if (i === 0 && vitals[at]!.steps !== reading.steps) {
      vitals[at] = reading;
      changed = true;
    }
  }
  if (!newLogs.length && !changed) return state;
  return { ...state, logs: [...state.logs, ...newLogs], vitals: vitals.sort((a, b) => (a.date < b.date ? -1 : 1)) };
}

/** The latest summary for a day, from whichever tracker sent it. */
export function vitalsOn(state: DomainState, date: ISODate): VitalsDay | undefined {
  return (state.vitals ?? []).filter((v) => v.date === date).at(-1);
}
