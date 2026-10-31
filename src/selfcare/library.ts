import { CARE_FOODS, CARE_PLANS, CARE_VIDEOS, type CareItem, type CareStage } from '../content/selfcare';
import { currentPeriodDay, postpartumLabel } from '../domain/stage';
import type { DomainState } from '../domain/types';

/**
 * Which part of the self-care library suits her today (decision 2026-10-30).
 * Postpartum is counted for the first year, as the week ring does.
 */
export function careStage(state: DomainState, now: Date): CareStage {
  if (state.her.phase === 'pregnancy') return 'pregnancy';
  if (currentPeriodDay(state, now)) return 'period';
  if (state.her.phase === 'postpartum') return 'postpartum';
  return 'cycle';
}

function suits(item: CareItem, state: DomainState, now: Date): boolean {
  const stage = careStage(state, now);
  if (!item.for.includes(stage)) return false;
  // A plan that waits for the postpartum check-up waits for everyone in the first weeks, period or not.
  const week = postpartumLabel(state, now);
  return !(item.fromPostpartumWeek && week !== undefined && week < item.fromPostpartumWeek);
}

export function careFor(state: DomainState, now: Date) {
  const pick = <T extends CareItem>(xs: T[]) => xs.filter((x) => suits(x, state, now));
  return { plans: pick(CARE_PLANS), videos: pick(CARE_VIDEOS), foods: pick(CARE_FOODS) };
}

export function planDaysDone(state: DomainState, planId: string): number[] {
  return state.selfCare?.plans[planId] ?? [];
}

/** Mark a plan day done, or not done again. Days are 0-based. */
export function togglePlanDay(state: DomainState, planId: string, day: number): DomainState {
  const done = planDaysDone(state, planId);
  const next = done.includes(day) ? done.filter((d) => d !== day) : [...done, day].sort((a, b) => a - b);
  return { ...state, selfCare: { plans: { ...state.selfCare?.plans, [planId]: next } } };
}
