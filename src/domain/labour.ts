import type { Contraction, LogEntry } from './types';

/**
 * Labour mode maths (PRD 9.6). Gaps are measured start to start. The thresholds
 * below are the "three signs" guidance, which NEEDS CLINICAL REVIEW: they live
 * in config so a clinician can change them without touching the screens.
 */
export const LABOUR_CONFIG = {
  /** "Five minutes apart or less" */
  maxGapSec: 5 * 60,
  /** "Lasting about a minute": treated as 50 seconds or more. Needs clinical review. */
  minDurationSec: 50,
  /** "Holding that for an hour" */
  holdMin: 60,
  /** Window for the stats and the bar strip. */
  windowMin: 60,
} as const;

const t = (iso: string) => new Date(iso).getTime();

export interface LabourStats {
  count: number;
  running?: Contraction;
  /** Seconds since the last contraction started, if any. */
  sinceLastSec?: number;
  avgGapSec?: number;
  avgDurationSec?: number;
  /** Minutes the "five minutes apart" pattern has held, counted back from the latest contraction. */
  holdingMin: number;
  signs: { apart: boolean; lasting: boolean; holding: boolean };
  signsMet: number;
  bars: { start: number; end: number }[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

export function labourStats(contractions: Contraction[], now: Date, cfg = LABOUR_CONFIG): LabourStats {
  const nowMs = now.getTime();
  const sorted = [...contractions].filter((c) => t(c.start) <= nowMs).sort((a, b) => t(a.start) - t(b.start));
  const last = sorted.at(-1);
  const running = last && !last.end ? last : undefined;
  const done = sorted.filter((c) => c.end);
  const windowStart = nowMs - cfg.windowMin * 60_000;

  const inWindow = sorted.filter((c) => t(c.start) >= windowStart);
  const gaps: number[] = [];
  for (let i = 1; i < inWindow.length; i++) gaps.push((t(inWindow[i]!.start) - t(inWindow[i - 1]!.start)) / 1000);
  const durations = inWindow.filter((c) => c.end).map((c) => (t(c.end!) - t(c.start)) / 1000);
  const avgGapSec = mean(gaps);
  const avgDurationSec = mean(durations);

  // Holding: walk back from the latest contraction while every gap stays within the limit.
  let holdingMin = 0;
  if (sorted.length >= 2) {
    let i = sorted.length - 1;
    while (i > 0 && (t(sorted[i]!.start) - t(sorted[i - 1]!.start)) / 1000 <= cfg.maxGapSec) i--;
    const lastStart = t(sorted.at(-1)!.start);
    // The run only counts while it is current: the latest contraction must be within the gap limit of now.
    if ((nowMs - lastStart) / 1000 <= cfg.maxGapSec) holdingMin = (lastStart - t(sorted[i]!.start)) / 60_000;
  }

  const signs = {
    apart: avgGapSec !== undefined && avgGapSec <= cfg.maxGapSec,
    lasting: avgDurationSec !== undefined && avgDurationSec >= cfg.minDurationSec,
    holding: false,
  };
  signs.holding = signs.apart && signs.lasting && holdingMin >= cfg.holdMin;

  return {
    count: sorted.length,
    running,
    sinceLastSec: last ? (nowMs - t(last.start)) / 1000 : undefined,
    avgGapSec,
    avgDurationSec,
    holdingMin,
    signs,
    signsMet: Number(signs.apart) + Number(signs.lasting) + Number(signs.holding),
    bars: done.filter((c) => t(c.end!) >= windowStart).map((c) => ({ start: t(c.start), end: t(c.end!) })),
  };
}

/** "4m 16s", "39s" */
export function formatSeconds(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

/** "3:04" */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * Practice contractions before labour (R12): average gap per day, for days
 * with at least three practice contractions. Sessions are runs with gaps
 * under 30 minutes; gaps between sessions are ignored.
 */
export function practiceGapsByDay(logs: LogEntry[], now: Date, days = 3): { day: string; avgGapMin: number }[] {
  const practice = logs
    .filter((l) => l.type === 'practice_contraction' && l.subject.kind === 'her' && t(l.at) <= now.getTime())
    .sort((a, b) => t(a.at) - t(b.at));
  const byDay = new Map<string, number[]>();
  for (let i = 1; i < practice.length; i++) {
    const gapMin = (t(practice[i]!.at) - t(practice[i - 1]!.at)) / 60_000;
    if (gapMin > 30) continue;
    const d = new Date(practice[i]!.at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(key, [...(byDay.get(key) ?? []), gapMin]);
  }
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return [...byDay.entries()]
    .filter(([, gaps]) => gaps.length >= 2)
    .map(([day, gaps]) => ({ day, avgGapMin: gaps.reduce((a, b) => a + b, 0) / gaps.length }))
    .filter(({ day }) => {
      const [y, m, dd] = day.split('-').map(Number);
      return new Date(y!, m!, dd!) >= cutoff;
    });
}
