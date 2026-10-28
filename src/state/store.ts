import { createContext, useContext } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DomainState, LogEntry, LogPayload, Subject } from '../domain/types';
import { addLog, removeLog } from '../domain/transitions';
import { advanceClock, getClockOffset, now, setClockOffset, setNow } from './clock';
import { ANCHOR, buildPersona, type PersonaId } from './personas';

/**
 * App store. Domain changes go through the pure transitions in domain/ via
 * `apply`, so the rules live in one place and are unit-tested there.
 * Persisted to localStorage (PRD 15: local only).
 */

export interface WeaveStore {
  domain: DomainState;
  personaId: PersonaId | null;
  /** False on a fresh install: the app opens on onboarding until she finishes it or loads sample data. */
  onboarded: boolean;
  clockOffsetMs: number;
  demo: { reviewMarkers: boolean; panelOpen: boolean };

  /** Run a pure transition against current state and the demo clock. */
  apply: (fn: (s: DomainState, at: Date) => DomainState) => void;
  log: (subject: Subject, payload: LogPayload, source?: LogEntry['source'], extra?: Partial<Pick<LogEntry, 'note' | 'groupId'>>) => LogEntry;
  undo: (logIds: string[]) => void;

  loadPersona: (id: PersonaId) => void;
  resetPersona: () => void;
  setClock: (d: Date) => void;
  advance: (ms: number) => void;
  setReviewMarkers: (on: boolean) => void;
  setPanelOpen: (open: boolean) => void;
}

export const STORAGE_KEY = 'weave-v1';

/** Seeded relative to the demo clock, so a persona always looks like it is being used right now. */
function personaState(id: PersonaId, at: Date = now()) {
  return { domain: buildPersona(id, at), personaId: id, onboarded: true };
}

/**
 * Longer than this between saves means the app was closed. The demo clock then
 * resumes where it stopped instead of jumping ahead by real time, which would
 * leave the seeded day looking stale ("47h since last meal").
 */
export const CLOCK_RESUME_AFTER_MS = 6 * 3600_000;

export const useWeave = create<WeaveStore>()(
  persist(
    (set, get) => ({
      ...personaState('D3', ANCHOR),
      onboarded: false,
      clockOffsetMs: ANCHOR.getTime() - Date.now(),
      demo: { reviewMarkers: true, panelOpen: false },

      apply: (fn) => set({ domain: fn(get().domain, now()) }),
      log: (subject, payload, source = 'quick', extra) => {
        const r = addLog(get().domain, subject, payload, now(), source, extra);
        set({ domain: r.state });
        return r.entry;
      },
      undo: (ids) => set({ domain: ids.reduce(removeLog, get().domain) }),

      // The clock stays where it is; the persona is seeded around it. "Anchor" in the
      // demo panel returns to 27 August 10:30, the time the Figma frames show.
      loadPersona: (id) => set({ ...personaState(id), clockOffsetMs: getClockOffset() }),
      resetPersona: () => get().loadPersona(get().personaId ?? 'D3'),
      setClock: (d) => {
        setNow(d);
        set({ clockOffsetMs: getClockOffset() });
      },
      advance: (ms) => {
        advanceClock(ms);
        set({ clockOffsetMs: getClockOffset() });
      },
      setReviewMarkers: (on) => set({ demo: { ...get().demo, reviewMarkers: on } }),
      setPanelOpen: (open) => set({ demo: { ...get().demo, panelOpen: open } }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      // v2 added vaccinations; earlier saves load with an empty list.
      // v3 added onboarded; anyone with an earlier save was already using the app.
      migrate: (persisted, from) => {
        const p = persisted as { domain?: DomainState; onboarded?: boolean };
        if (from < 2 && p.domain) p.domain = { ...p.domain, vaccinations: p.domain.vaccinations ?? [] };
        if (from < 3) p.onboarded = true;
        return p as never;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ domain: s.domain, personaId: s.personaId, onboarded: s.onboarded, clockOffsetMs: s.clockOffsetMs, savedAt: Date.now(), demo: { ...s.demo, panelOpen: false } }),
      onRehydrateStorage: () => (s) => {
        if (!s) return;
        const savedAt = (s as WeaveStore & { savedAt?: number }).savedAt;
        const away = savedAt ? Date.now() - savedAt : 0;
        const offset = away > CLOCK_RESUME_AFTER_MS ? s.clockOffsetMs - away : s.clockOffsetMs;
        setClockOffset(offset);
        s.clockOffsetMs = offset;
      },
    },
  ),
);

// First load with no persisted state: start the clock at the anchor.
setClockOffset(useWeave.getState().clockOffsetMs);

/** Wipe everything stored on this device (PRD 15 "delete everything"). */
export function deleteEverything(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('weave-metrics-v1');
  window.location.reload();
}

/** Export everything stored on this device as JSON (PRD 15 "export"). */
export function exportEverything(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), weave: localStorage.getItem(STORAGE_KEY), metrics: localStorage.getItem('weave-metrics-v1') }, null, 2);
}

/**
 * Read the domain. Screens use this (not useWeave directly) so the gallery can
 * render any persona side by side without touching the live store.
 */
export const DomainOverride = createContext<DomainState | null>(null);
export function useDomain(): DomainState {
  const override = useContext(DomainOverride);
  const live = useWeave((s) => s.domain);
  return override ?? live;
}
