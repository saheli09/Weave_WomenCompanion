import { buildPersona, ANCHOR } from '../state/personas';
import { connectDevice, disconnectDevice, IMPORT_DAYS, syncDevices } from './devices';
import { addDaysISO, toISODate } from './dates';
import { checkInvariants, emptyState } from './transitions';
import type { DomainState, LogEntry } from './types';

const herSleeps = (s: DomainState) => s.logs.filter((l): l is Extract<LogEntry, { type: 'sleep' }> => l.type === 'sleep' && l.subject.kind === 'her');
const hours = (l: Extract<LogEntry, { type: 'sleep' }>) => (new Date(l.end!).getTime() - new Date(l.start).getTime()) / 3600_000;
const later = (h: number) => new Date(ANCHOR.getTime() + h * 3600_000);

describe('connected apps (UI only)', () => {
  const tracker = () => emptyState('Asha', 'cycle_tracking');

  it('connecting brings in two weeks: a summary each day and each night she has woken from', () => {
    const s = connectDevice(tracker(), 'fitbit', ANCHOR);
    expect(s.vitals).toHaveLength(IMPORT_DAYS);
    expect(s.vitals!.at(-1)!.date).toBe(toISODate(ANCHOR));
    const sleeps = herSleeps(s);
    expect(sleeps).toHaveLength(IMPORT_DAYS); // 10:30: this morning's wake is in
    expect(sleeps.every((l) => l.source === 'device' && l.device === 'fitbit' && new Date(l.end!) <= ANCHOR)).toBe(true);
    expect(sleeps.every((l) => hours(l) >= 6.4 && hours(l) <= 8)).toBe(true);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('is deterministic and returns the same state when there is nothing new', () => {
    const a = connectDevice(tracker(), 'oura', ANCHOR);
    expect(connectDevice(tracker(), 'oura', ANCHOR).vitals).toEqual(a.vitals);
    expect(syncDevices(a, ANCHOR)).toBe(a);
  });

  it('keeps going as time moves: the next night once she wakes, today’s steps through the day', () => {
    const s = connectDevice(tracker(), 'fitbit', ANCHOR);
    const evening = syncDevices(s, later(8));
    expect(evening.vitals!.at(-1)!.steps).toBeGreaterThan(s.vitals!.at(-1)!.steps);
    expect(herSleeps(evening)).toHaveLength(IMPORT_DAYS);
    const next = syncDevices(evening, later(23));
    expect(next.vitals!.at(-1)!.date).toBe(addDaysISO(toISODate(ANCHOR), 1));
    expect(herSleeps(next)).toHaveLength(IMPORT_DAYS + 1);
  });

  it('never doubles a night she logged herself', () => {
    const d1 = buildPersona('D1'); // four nights logged by hand
    const byHand = herSleeps(d1).length;
    const s = connectDevice(d1, 'apple_health', ANCHOR);
    const ends = herSleeps(s).map((l) => toISODate(new Date(l.end!)));
    expect(new Set(ends).size).toBe(ends.length);
    expect(herSleeps(s).filter((l) => l.source !== 'device')).toHaveLength(byHand);
  });

  it('a baby under six months means shorter nights', () => {
    const s = connectDevice(buildPersona('D3'), 'fitbit', ANCHOR);
    expect(herSleeps(s).filter((l) => l.source === 'device').every((l) => hours(l) <= 6.2)).toBe(true);
  });

  it('disconnecting keeps what was brought in and stops new readings', () => {
    const s = disconnectDevice(connectDevice(tracker(), 'fitbit', ANCHOR));
    expect(s.devices).toBeUndefined();
    expect(s.vitals).toHaveLength(IMPORT_DAYS);
    expect(syncDevices(s, later(30))).toBe(s);
  });

  it('switching apps hands the import window to the new one; older readings and her own entries stay', () => {
    const fitbit = connectDevice(buildPersona('D1'), 'fitbit', ANCHOR);
    const byHand = herSleeps(fitbit).filter((l) => l.source !== 'device').length;
    const weekLater = later(7 * 24);
    const s = connectDevice(syncDevices(fitbit, weekLater), 'oura', weekLater);
    const from = addDaysISO(toISODate(weekLater), -(IMPORT_DAYS - 1));
    const inWindow = (date: string) => date >= from;
    expect(s.devices?.connected).toBe('oura');
    expect(s.vitals!.filter((v) => inWindow(v.date)).every((v) => v.device === 'oura')).toBe(true);
    expect(s.vitals!.some((v) => v.device === 'fitbit' && !inWindow(v.date))).toBe(true);
    const deviceNights = herSleeps(s).filter((l) => l.source === 'device');
    expect(deviceNights.filter((l) => inWindow(toISODate(new Date(l.end!)))).every((l) => l.device === 'oura')).toBe(true);
    expect(deviceNights.some((l) => l.device === 'fitbit')).toBe(true); // the week before the window
    expect(herSleeps(s).filter((l) => l.source !== 'device')).toHaveLength(byHand);
    const ends = herSleeps(s).map((l) => toISODate(new Date(l.end!)));
    expect(new Set(ends).size).toBe(ends.length);
  });

  it('D7 arrives with Fitbit connected and no nights logged by hand', () => {
    const s = buildPersona('D7');
    expect(s.devices?.connected).toBe('fitbit');
    expect(herSleeps(s).every((l) => l.source === 'device')).toBe(true);
  });
});
