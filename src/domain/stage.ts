import { childAge, pregnancyWeek, postpartumWeek, calendarDaysBetween } from './dates';
import type { Child, DomainState, LogEntry } from './types';

/** Configurable thresholds. Section 13 ages, 17.2 #3 decision. */
export const STAGE_CONFIG = {
  infantFromMonths: 3,
  solidsFromMonths: 6,
  toddlerFromMonths: 12,
  /** "Week N postpartum" label shows up to this many months after birth (decision 2026-10-01). */
  postpartumLabelMonths: 12,
  labourModeFromWeek: 36,
  cycleCardFromPostpartumWeek: 6,
} as const;

export type ChildStage = 'newborn' | 'infant' | 'solids' | 'toddler';

/** Stage is derived from age (section 13); usage taper is layered on top in the UI. */
export function deriveStage(child: Child, now: Date): ChildStage {
  const { totalMonths } = childAge(child.dob, now);
  if (totalMonths >= STAGE_CONFIG.toddlerFromMonths) return 'toddler';
  if (totalMonths >= STAGE_CONFIG.solidsFromMonths) return 'solids';
  if (totalMonths >= STAGE_CONFIG.infantFromMonths) return 'infant';
  return 'newborn';
}

/**
 * The composition Today uses (9.1). Her state and children are independent
 * (6.3), so this is derived from both rather than stored.
 */
export type TodayState =
  | 'pregnancy'
  | 'pregnancy_late' // week 36 onward: Labour mode card
  | 'labour'
  | 'pregnancy_with_child'
  | 'postpartum_baby' // newborn or infant
  | 'postpartum_solids'
  | 'toddler'
  | 'cycle_only'
  | 'empty';

export function primaryChild(state: DomainState): Child | undefined {
  // Youngest child leads. Never compared with siblings (principle 8).
  return [...state.children].sort((a, b) => (a.dob < b.dob ? 1 : -1))[0];
}

export function deriveTodayState(state: DomainState, now: Date): TodayState {
  const { her } = state;
  const child = primaryChild(state);
  if (her.phase === 'pregnancy' && her.pregnancy) {
    if (her.pregnancy.labour && !her.pregnancy.labour.endedAt) return 'labour';
    if (child) return 'pregnancy_with_child';
    return pregnancyWeek(her.pregnancy.dueDate, now).week >= STAGE_CONFIG.labourModeFromWeek ? 'pregnancy_late' : 'pregnancy';
  }
  if (child) {
    const stage = deriveStage(child, now);
    if (stage === 'toddler') return 'toddler';
    if (stage === 'solids') return 'postpartum_solids';
    return 'postpartum_baby';
  }
  if (her.phase === 'cycle_tracking' || her.cycle.active) return 'cycle_only';
  return 'empty';
}

/** "Week N" postpartum label, or undefined once it has expired (17.2 #3). */
export function postpartumLabel(state: DomainState, now: Date): number | undefined {
  const pp = state.her.postpartum;
  if (state.her.phase !== 'postpartum' || !pp) return undefined;
  const birth = state.births.find((b) => b.id === pp.birthId);
  const at = birth?.datetime ?? pp.startedAt;
  const days = calendarDaysBetween(at.slice(0, 10), now);
  if (days > STAGE_CONFIG.postpartumLabelMonths * 30.44) return undefined;
  return postpartumWeek(at, now);
}

/** Current period day (1-based) if a period is in progress, from her explicit logs only (6.3). */
export function currentPeriodDay(state: DomainState, now: Date): number | undefined {
  const { cycle } = state.her;
  if (!cycle.active || !cycle.lastPeriodStart) return undefined;
  const ended = state.logs.some(
    (l) => l.type === 'period' && l.event === 'end' && l.at.slice(0, 10) >= cycle.lastPeriodStart!,
  );
  if (ended) return undefined;
  const day = calendarDaysBetween(cycle.lastPeriodStart, now) + 1;
  return day >= 1 ? day : undefined;
}

/** True when the household uses formula (9.15 "Who sees it"). Derived, never stored. */
export function usesFormula(state: DomainState, childId: string): boolean {
  return (
    state.formulaPacks.some((p) => p.childId === childId) ||
    state.logs.some(
      (l: LogEntry) =>
        l.subject.kind === 'child' && l.subject.childId === childId && l.type === 'feed' && l.mode === 'bottle' && l.content === 'formula',
    )
  );
}

/**
 * The fourth tab follows her main journey (decision 2026-10-28). Me is how she
 * is today; this tab is the journey over weeks and months.
 * - Any child, unless she is pregnant and the youngest is two or older: Baby.
 * - Pregnant: Pregnancy.
 * - Otherwise (cycle tracking): Cycle.
 * Adding a child or saving a birth switches it to Baby; nothing is set by hand.
 */
export type StageTab = 'baby' | 'pregnancy' | 'cycle';

/**
 * The journey tab. A child always has Baby, even when she is pregnant again;
 * her pregnancy then sits in Self care, behind a Self care | Pregnancy switch
 * (decision 2026-10-31).
 */
export function stageTab(state: DomainState, _now: Date): StageTab {
  if (primaryChild(state)) return 'baby';
  if (state.her.phase === 'pregnancy' && state.her.pregnancy) return 'pregnancy';
  return 'cycle';
}

/** Pregnant with a child: both the Baby tab and the pregnancy inside Self care. */
export const pregnantWithChild = (state: DomainState): boolean =>
  state.her.phase === 'pregnancy' && Boolean(state.her.pregnancy) && Boolean(primaryChild(state));
