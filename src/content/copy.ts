/**
 * Copy primitives. Every user-facing string lives in a CopyEntry so the copy
 * lint (insights/copyLint.ts) can scan it and review flags travel with the text.
 */

export type ReviewKind = 'clinical' | 'lactation' | 'perinatal' | 'product' | 'design';

export interface Review {
  kind: ReviewKind;
  /** PRD section that raises the review, e.g. "9.6". */
  ref: string;
  note?: string;
}

export type CopyKind =
  | 'headline' // serif headlines: insight headlines, card titles. Numbers below ten spelled out.
  | 'title' // screen and sheet titles
  | 'body' // muted body lines
  | 'support' // supportive lines (week card, around-now). Linted like insights.
  | 'label' // UI labels, may hold numerals
  | 'action' // button labels
  | 'a11y'; // screen-reader only labels

export interface CopyEntry {
  text: string;
  kind: CopyKind;
  review?: Review;
}

export const copy = (text: string, kind: CopyKind, review?: Review): CopyEntry => ({ text, kind, review });

/** Fill {placeholders}. Unknown keys are left visible so missing data is caught in review, not hidden. */
export function fmt(entry: CopyEntry | string, params: Record<string, string | number> = {}): string {
  const text = typeof entry === 'string' ? entry : entry.text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
