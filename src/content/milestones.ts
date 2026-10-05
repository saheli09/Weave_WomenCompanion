import { copy, type CopyEntry, type Review } from './copy';

/**
 * Suggested milestone checks for "Coming up" (PRD 9.5). From config, not
 * hard-coded in screens. Weeks are placeholders until clinically reviewed.
 */
export interface Milestone {
  id: string;
  title: CopyEntry;
  fromWeek: number;
  toWeek: number;
  /** Week shown on the "not booked" line. */
  suggestedWeek: number;
  review: Review;
}

const review: Review = { kind: 'clinical', ref: '9.5', note: 'Milestone check schedule' };

export const MILESTONES: Milestone[] = [
  { id: 'anomaly-scan', title: copy('Anomaly scan', 'label'), fromWeek: 18, toWeek: 21, suggestedWeek: 20, review },
  { id: 'glucose-test', title: copy('Glucose test', 'label'), fromWeek: 22, toWeek: 28, suggestedWeek: 26, review },
  { id: 'growth-scan', title: copy('Growth scan', 'label'), fromWeek: 30, toWeek: 34, suggestedWeek: 32, review },
  { id: 'gbs-swab', title: copy('Group B strep check', 'label'), fromWeek: 35, toWeek: 37, suggestedWeek: 36, review },
];

export const milestonesForWeek = (week: number): Milestone[] => MILESTONES.filter((m) => week >= m.fromWeek - 2 && week <= m.toWeek);
