import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Time-to-log instrumentation (PRD 10.1, 16.6). Local only, no analytics.
 *
 * Definition (agreed 2026-10-01):
 *  - start: the first tap on an entry point (FAB, a "+" on a card, a module's log button)
 *  - end: the moment the log is committed to the store
 *  - taps: every pointerdown between start and end, including the first
 *  - a session closed without saving is recorded as abandoned
 * Uses wall-clock time (performance.now), never the demo clock.
 */

export type LogAction =
  | 'water'
  | 'diaper'
  | 'mood'
  | 'feed_breast'
  | 'feed_bottle'
  | 'feed_solids'
  | 'feed_combo'
  | 'sleep'
  | 'pump'
  | 'bleeding'
  | 'dose'
  | 'formula_opened'
  | 'period'
  | 'symptom'
  | 'weight'
  | 'note'
  | 'contraction'
  | 'other';

export interface LogTiming {
  action: LogAction;
  entry: string; // where it started, e.g. "today.her.water", "fab"
  ms: number;
  taps: number;
  outcome: 'saved' | 'abandoned';
  at: string; // wall-clock ISO
  persona: string | null;
}

interface Session {
  entry: string;
  t0: number;
  taps: number;
}

let session: Session | null = null;

function onPointerDown() {
  if (session) session.taps += 1;
}

if (typeof document !== 'undefined') {
  // Capture phase so taps on any control count, including the one that ends the session.
  document.addEventListener('pointerdown', onPointerDown, true);
}

interface MetricsStore {
  timings: LogTiming[];
  record: (t: LogTiming) => void;
  clear: () => void;
}

export const useMetrics = create<MetricsStore>()(
  persist(
    (set, get) => ({
      timings: [],
      record: (t) => set({ timings: [...get().timings, t] }),
      clear: () => set({ timings: [] }),
    }),
    { name: 'weave-metrics-v1', storage: createJSONStorage(() => localStorage) },
  ),
);

let personaProvider: () => string | null = () => null;
export const setMetricsPersonaProvider = (fn: () => string | null) => {
  personaProvider = fn;
};

/**
 * Start a session. Call from the entry point's pointerdown/click handler.
 * The tap that starts the session has already been counted by the time the
 * click fires, so taps start at 1.
 */
export function beginLog(entry: string): void {
  session = { entry, t0: performance.now(), taps: 1 };
}

/** Commit the session as saved. Instant logs (no sheet) call begin + commit in one go. */
export function commitLog(action: LogAction, entryIfInstant?: string): void {
  if (!session && entryIfInstant) beginLog(entryIfInstant);
  if (!session) return;
  const s = session;
  session = null;
  useMetrics.getState().record({
    action,
    entry: s.entry,
    ms: Math.round(performance.now() - s.t0),
    taps: s.taps,
    outcome: 'saved',
    at: new Date().toISOString(),
    persona: personaProvider(),
  });
}

export function abandonLog(action: LogAction = 'other'): void {
  if (!session) return;
  const s = session;
  session = null;
  useMetrics.getState().record({
    action,
    entry: s.entry,
    ms: Math.round(performance.now() - s.t0),
    taps: s.taps,
    outcome: 'abandoned',
    at: new Date().toISOString(),
    persona: personaProvider(),
  });
}

export const isLogging = (): boolean => session !== null;

// ---------- Summaries for the demo panel and the case study ----------

const quantile = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo]! + (s[hi]! - s[lo]!) * (i - lo);
};

export interface ActionSummary {
  action: LogAction;
  saved: number;
  abandoned: number;
  medianMs: number;
  p90Ms: number;
  maxMs: number;
  medianTaps: number;
  maxTaps: number;
  under10s: number; // share of saved logs at or under 10 s
}

export function summarise(timings: LogTiming[]): ActionSummary[] {
  const byAction = new Map<LogAction, LogTiming[]>();
  for (const t of timings) byAction.set(t.action, [...(byAction.get(t.action) ?? []), t]);
  return [...byAction.entries()].map(([action, ts]) => {
    const saved = ts.filter((t) => t.outcome === 'saved');
    const ms = saved.map((t) => t.ms);
    const taps = saved.map((t) => t.taps);
    return {
      action,
      saved: saved.length,
      abandoned: ts.length - saved.length,
      medianMs: quantile(ms, 0.5),
      p90Ms: quantile(ms, 0.9),
      maxMs: ms.length ? Math.max(...ms) : NaN,
      medianTaps: quantile(taps, 0.5),
      maxTaps: taps.length ? Math.max(...taps) : NaN,
      under10s: saved.length ? saved.filter((t) => t.ms <= 10_000).length / saved.length : NaN,
    };
  });
}

export function toCSV(timings: LogTiming[]): string {
  const head = 'at,persona,action,entry,outcome,ms,taps';
  const rows = timings.map((t) => [t.at, t.persona ?? '', t.action, t.entry, t.outcome, t.ms, t.taps].join(','));
  return [head, ...rows].join('\n');
}
